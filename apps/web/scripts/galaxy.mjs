/**
 * Galaxia: ubica cada tema en el plano usando solo cómo suena.
 *
 * 1. Huellas (Discogs-EffNet, 1280 dim) centradas en la media de la biblioteca y normalizadas:
 *    así el coseno mide en qué se diferencia un tema del promedio de TU música, no de la música en general.
 * 2. Grafo de vecinos mutuos: i y j se conectan si cada uno está entre los K más parecidos del otro.
 *    El "mutuo" evita que un tema genérico se vuelva vecino de todos.
 * 3. Comunidades (Louvain) sobre ese grafo: grupos de temas densamente conectados, sin fijar cuántos.
 *    Cada grupo recibe de nombre el estilo que el modelo más reconoce en sus temas.
 * 4. Disposición por fuerzas: resortes en las conexiones, repulsión entre todos y gravedad al centro.
 *    Los grupos grandes y conectados caen al centro; los temas raros, sin vecinos mutuos, quedan en el borde.
 * 5. PCA a 48 dimensiones para que el navegador pueda comparar cualquier par de temas.
 */
import { forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation, forceX, forceY } from 'd3-force'
import Graph from 'graphology'
import louvainPkg from 'graphology-communities-louvain'

const louvain = louvainPkg.default ?? louvainPkg

const K = 10
const PCA_DIMS = 48
const MIN_CLUSTER = 5
const MIN_ISLAND = 3
/**
 * Alcance: dos temas solo se conectan si su distancia no pasa de 1,25 veces la distancia típica
 * al quinto vecino en esa biblioteca. Sin este tope, un tema de otro mundo se engancha igual
 * a "los menos distintos" y termina dentro de un grupo que no le corresponde.
 */
const REACH = 1.25

function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const shortStyle = (s) => s.split('---').pop()

/** Peso de los tags sobre el parecido sonoro (coseno, que entre vecinos ronda 0,5 a 0,9). */
const W_GENRE = Number(process.env.GAL_WG ?? 0.25)
const W_LABEL = Number(process.env.GAL_WL ?? 0.2)

/** Género del tag, solo si dice algo: "Electro", "Dance" o "Music" vienen de fuentes que etiquetan todo igual. */
export function genreKey(tag) {
  const g = tag?.trim().toLowerCase()
  if (!g || g.includes(';') || /^(electro|dance|music|electronica|electronic|other|otro|unknown)$/.test(g)) return null
  return g.replace(/\s*[/&]\s*/g, ' & ')
}
/** Sello sin sufijos, para que "Bedrock" y "Bedrock Records" cuenten como el mismo. */
export function labelKey(label) {
  const l = label?.trim().toLowerCase().replace(/\s+(records?|recordings|music|musik|digital)$/g, '')
  return l || null
}

/** Matriz de cosenos entre huellas centradas y normalizadas. */
function similarity(embs) {
  const n = embs.length
  const d = embs[0].length
  const mean = new Float64Array(d)
  for (const e of embs) for (let i = 0; i < d; i++) mean[i] += e[i] / n
  const norms = []
  const X = embs.map((e) => {
    const v = new Float32Array(d)
    let norm = 0
    for (let i = 0; i < d; i++) {
      v[i] = e[i] - mean[i]
      norm += v[i] * v[i]
    }
    norm = Math.sqrt(norm) || 1
    norms.push(norm)
    for (let i = 0; i < d; i++) v[i] /= norm
    return v
  })
  const G = Array.from({ length: n }, () => new Float32Array(n))
  for (let i = 0; i < n; i++) {
    G[i][i] = 1
    for (let j = i + 1; j < n; j++) {
      let s = 0
      const a = X[i]
      const b = X[j]
      for (let k = 0; k < d; k++) s += a[k] * b[k]
      G[i][j] = G[j][i] = s
    }
  }
  // distancia euclídea entre huellas, en unidades de "distancia típica al quinto vecino"
  const D = G.map((row, i) => row.map((c, j) => Math.sqrt(Math.max(0, norms[i] ** 2 + norms[j] ** 2 - 2 * norms[i] * norms[j] * c))))
  const fifth = D.map((row, i) => Array.from(row).filter((_, j) => j !== i).sort((a, b) => a - b)[4]).sort((a, b) => a - b)
  const unit = fifth[Math.floor(n / 2)] || 1
  for (const row of D) for (let j = 0; j < n; j++) row[j] /= unit
  return { G, D }
}

/** Componentes principales desde la matriz de Gram (iteración de potencias con deflación). */
function pcaScores(G, dims) {
  const n = G.length
  const A = G.map((row) => Float64Array.from(row))
  const rand = rng(11)
  const scores = Array.from({ length: n }, () => new Float32Array(dims))
  for (let c = 0; c < Math.min(dims, n - 1); c++) {
    let v = Float64Array.from({ length: n }, () => rand() - 0.5)
    let lambda = 0
    for (let it = 0; it < 80; it++) {
      const w = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        let s = 0
        const row = A[i]
        for (let j = 0; j < n; j++) s += row[j] * v[j]
        w[i] = s
      }
      const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1
      for (let i = 0; i < n; i++) w[i] /= norm
      const diff = w.reduce((s, x, i) => s + Math.abs(x - v[i]), 0)
      v = w
      lambda = norm
      if (diff < 1e-7) break
    }
    if (lambda <= 1e-9) break
    const scale = Math.sqrt(lambda)
    for (let i = 0; i < n; i++) scores[i][c] = v[i] * scale
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] -= lambda * v[i] * v[j]
  }
  return scores
}

function toBase64(scores) {
  let max = 0
  for (const s of scores) for (const x of s) max = Math.max(max, Math.abs(x))
  return scores.map((s) => Buffer.from(Int8Array.from(s, (x) => Math.round((x / (max || 1)) * 127)).buffer).toString('base64'))
}

/** Qué fracción de los k vecinos más cercanos comparte etiqueta. Mide si "cerca" significa "del mismo tipo". */
function purity(order, labels, k = 10) {
  let sum = 0
  let n = 0
  order.forEach((nb, i) => {
    if (labels[i] == null) return
    sum += nb.slice(0, k).filter((j) => labels[j] === labels[i]).length / k
    n++
  })
  return n ? sum / n : 0
}

/**
 * @param tracks temas con `_emb` (huella) y `_styles` cuando hay análisis
 * @returns {{ clusters: object[], report: object } | null} y agrega x, y, cluster, style, emb y nn a cada tema
 */
export function buildGalaxy(tracks) {
  const idx = tracks.map((t, i) => (t._emb ? i : -1)).filter((i) => i >= 0)
  const n = idx.length
  if (n < 30) return null
  const T = idx.map((i) => tracks[i])
  const { G, D } = similarity(T.map((t) => t._emb))

  // el sonido manda; compartir género del tag o sello acerca un poco más
  const gk = T.map((t) => genreKey(t.tagGenre))
  const lk = T.map((t) => labelKey(t.label))
  const S = G.map((row, i) => row.map((v, j) => v + (gk[i] && gk[i] === gk[j] ? W_GENRE : 0) + (lk[i] && lk[i] === lk[j] ? W_LABEL : 0)))
  const soundOrder = G.map((row, i) =>
    Array.from(row.keys())
      .filter((j) => j !== i)
      .sort((a, b) => row[b] - row[a])
      .slice(0, 10),
  )

  // vecinos
  const order = S.map((row, i) =>
    Array.from(row.keys())
      .filter((j) => j !== i)
      .sort((a, b) => row[b] - row[a])
      .slice(0, 30),
  )
  const knn = order.map((o) => new Set(o.slice(0, K)))

  const graph = new Graph({ type: 'undirected' })
  for (let i = 0; i < n; i++) graph.addNode(i)
  const edges = []
  for (let i = 0; i < n; i++) {
    for (const j of knn[i]) {
      if (j <= i || !knn[j].has(i) || D[i][j] > REACH) continue
      const w = Math.max(0.01, Math.min(1, S[i][j]))
      graph.addEdge(i, j, { weight: w })
      edges.push([i, j, w])
    }
  }

  // comunidades
  const community = louvain(graph, { getEdgeWeight: 'weight', resolution: 1.1, rng: rng(5) })
  const groups = new Map()
  for (let i = 0; i < n; i++) {
    if (!graph.degree(i)) continue
    const c = community[i]
    if (!groups.has(c)) groups.set(c, [])
    groups.get(c).push(i)
  }
  // una isla chica vale como grupo si es un componente entero: conectada entre sí y con nadie más
  const component = new Array(n).fill(-1)
  const componentSize = []
  for (let i = 0; i < n; i++) {
    if (component[i] >= 0) continue
    const id = componentSize.length
    const queue = [i]
    component[i] = id
    let size = 0
    while (queue.length) {
      const u = queue.pop()
      size++
      graph.forEachNeighbor(u, (v) => {
        const k = Number(v)
        if (component[k] < 0) {
          component[k] = id
          queue.push(k)
        }
      })
    }
    componentSize.push(size)
  }
  const isIsland = (m) => m.length >= MIN_ISLAND && componentSize[component[m[0]]] === m.length
  const clusters = [...groups.values()].filter((m) => m.length >= MIN_CLUSTER || isIsland(m)).sort((a, b) => b.length - a.length)
  const rare = Array.from({ length: n }, (_, i) => !graph.degree(i))
  const clusterOf = new Array(n).fill(null)
  clusters.forEach((members, c) => members.forEach((i) => (clusterOf[i] = c)))

  // nombre: el estilo con más peso entre los temas del grupo
  const info = clusters.map((members, c) => {
    const votes = new Map()
    for (const i of members) for (const [s, p] of T[i]._styles ?? []) votes.set(shortStyle(s), (votes.get(shortStyle(s)) ?? 0) + p)
    const top = [...votes].sort((a, b) => b[1] - a[1]).map(([s]) => s)
    // si buena parte del grupo comparte género en sus tags, ese nombre es el que el DJ reconoce
    const tagged = new Map()
    for (const i of members) if (gk[i]) tagged.set(T[i].tagGenre.trim(), (tagged.get(T[i].tagGenre.trim()) ?? 0) + 1)
    const [tagName, tagCount] = [...tagged].sort((a, b) => b[1] - a[1])[0] ?? []
    if (tagName && tagCount >= members.length * 0.4) top.unshift(...[tagName].filter((n) => n !== top[0]))
    const energies = members.map((i) => T[i].energy).filter((e) => e != null)
    return { id: c, n: members.length, top, energy: energies.reduce((a, b) => a + b, 0) / (energies.length || 1), label: top[0] ?? `Grupo ${c + 1}` }
  })
  const dup = (label) => info.filter((x) => x.label === label)
  for (const group of new Set(info.map((x) => x.label))) {
    const same = dup(group)
    if (same.length < 2) continue
    same.forEach((x) => {
      const second = x.top.find((s) => s !== group && !same.some((o) => o !== x && o.top[1] === s))
      if (second) x.label = `${group} · ${second}`
    })
  }
  for (const group of new Set(info.map((x) => x.label))) {
    const same = dup(group).sort((a, b) => a.energy - b.energy)
    if (same.length < 2) continue
    const words = same.length === 2 ? ['tranqui', 'arriba'] : same.length === 3 ? ['tranqui', 'medio', 'arriba'] : same.map((_, i) => `${i + 1}`)
    same.forEach((x, i) => (x.label = `${x.label} · ${words[i]}`))
  }

  // disposición por fuerzas, partiendo de las dos primeras componentes principales
  const scores = pcaScores(G, PCA_DIMS)
  const spread = 900
  const nodes = T.map((_, i) => ({ id: i, hub: false, x: scores[i][0] * spread, y: scores[i][1] * spread, cluster: clusterOf[i] }))
  const hubs = clusters.map((members, c) => ({
    id: `h${c}`,
    hub: true,
    size: members.length,
    x: (members.reduce((s, i) => s + scores[i][0], 0) / members.length) * spread,
    y: (members.reduce((s, i) => s + scores[i][1], 0) / members.length) * spread,
  }))
  const links = [
    ...edges.map(([a, b, w]) => ({ source: a, target: b, kind: 'near', w })),
    ...nodes.filter((nd) => nd.cluster != null).map((nd) => ({ source: nd.id, target: `h${nd.cluster}`, kind: 'spoke', size: clusters[nd.cluster].length })),
  ]
  // grupos parecidos entre sí quedan vecinos: cada centro se une a sus dos centros más cercanos
  const between = (a, b) => {
    let s = 0
    for (const i of clusters[a]) for (const j of clusters[b]) s += S[i][j]
    return s / (clusters[a].length * clusters[b].length)
  }
  // y la separación crece con la diferencia: grupos afines casi se tocan, una isla de otro mundo queda apartada
  const far = (a, b) => {
    let s = 0
    for (const i of clusters[a]) for (const j of clusters[b]) s += D[i][j]
    return s / (clusters[a].length * clusters[b].length)
  }
  const nearest = clusters.map((_, a) =>
    clusters
      .map((_, b) => b)
      .filter((b) => b !== a)
      .sort((x, y) => between(a, y) - between(a, x))
      .slice(0, 2),
  )
  const typical = nearest.map((nb, a) => (nb.length ? far(a, nb[0]) : 0)).sort((x, y) => x - y)[Math.floor(clusters.length / 2)] ?? 0
  nearest.forEach((nb, a) =>
    nb.forEach((b) => links.push({ source: `h${a}`, target: `h${b}`, kind: 'bridge', size: clusters[a].length + clusters[b].length, extra: Math.max(0, far(a, b) - typical) * 170 })),
  )

  // fase 1: los grupos. Resortes en las conexiones, repulsión entre todos y gravedad al centro.
  const grouped = nodes.filter((nd) => nd.cluster != null)
  const loose = nodes.filter((nd) => nd.cluster == null)
  const groupedIds = new Set(grouped.map((nd) => nd.id))
  const coreLinks = links.filter((l) => l.kind !== 'near' || (groupedIds.has(l.source) && groupedIds.has(l.target)))
  const sim = forceSimulation([...grouped, ...hubs])
    .randomSource(rng(9))
    .force(
      'link',
      forceLink(coreLinks)
        .id((d) => d.id)
        .distance((l) => (l.kind === 'near' ? 13 : l.kind === 'spoke' ? 9 + 2.4 * Math.sqrt(l.size) : 26 + 3.6 * Math.sqrt(l.size) + l.extra))
        .strength((l) => (l.kind === 'near' ? 0.1 * l.w : l.kind === 'spoke' ? 0.42 : 0.09)),
    )
    .force('charge', forceManyBody().strength((d) => (d.hub ? -80 - 5 * Math.sqrt(d.size) : -11)).distanceMax(240))
    .force('collide', forceCollide((d) => (d.hub ? 7 : 4.3)).strength(0.9))
    .force('x', forceX(0).strength(0.06))
    .force('y', forceY(0).strength(0.06))
    .stop()
  sim.tick(600)

  const core = [...grouped, ...hubs]
  const cx = core.reduce((s, d) => s + d.x, 0) / core.length
  const cy = core.reduce((s, d) => s + d.y, 0) / core.length
  const body = Math.max(...core.map((d) => Math.hypot(d.x - cx, d.y - cy)))

  // fase 2: los sueltos (raros o sin grupo) forman el anillo exterior,
  // cada uno del lado del tema agrupado al que más se parece.
  for (const nd of loose) {
    const closest = order[nd.id].find((j) => clusterOf[j] != null)
    const ref = closest != null ? nodes[closest] : null
    const angle = ref ? Math.atan2(ref.y - cy, ref.x - cx) : rng(nd.id + 1)() * Math.PI * 2
    const r = body + 22 + rng(nd.id + 77)() * 26
    nd.x = cx + Math.cos(angle) * r
    nd.y = cy + Math.sin(angle) * r
  }
  for (const d of core) {
    d.fx = d.x
    d.fy = d.y
  }
  if (loose.length) {
    forceSimulation([...core, ...loose])
      .randomSource(rng(13))
      .force('ring', forceRadial(body + 30, cx, cy).strength((d) => (d.cluster == null && !d.hub ? 0.25 : 0)))
      .force('collide', forceCollide((d) => (d.hub ? 7 : 5.2)).strength(1))
      .stop()
      .tick(260)
  }

  const all = [...nodes, ...hubs]
  const R = Math.max(...all.map((d) => Math.hypot(d.x - cx, d.y - cy))) * 1.03
  const unit = (d) => [Math.round((0.5 + (d.x - cx) / (2 * R)) * 1e4) / 1e4, Math.round((0.5 + (d.y - cy) / (2 * R)) * 1e4) / 1e4]

  const packed = toBase64(scores)
  const mutual = Array.from({ length: n }, () => [])
  for (const [a, b, w] of edges) {
    mutual[a].push([b, w])
    mutual[b].push([a, w])
  }
  T.forEach((t, i) => {
    ;[t.x, t.y] = unit(nodes[i])
    t.cluster = clusterOf[i]
    t.style = t._styles?.[0] ? shortStyle(t._styles[0][0]) : null
    t.emb = packed[i]
    t.nn = mutual[i]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([j]) => T[j].id)
  })

  // ¿"cerca" coincide con las carpetas del usuario? Se compara contra las 4 medidas simples.
  const basic = T.map((t) => [t.energy, t.dance, t.bright, t.bpm])
  const cols = [0, 1, 2, 3].map((c) => {
    const v = basic.map((r) => r[c]).filter((x) => x != null)
    const m = v.reduce((a, b) => a + b, 0) / (v.length || 1)
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length || 1)) || 1
    return basic.map((r) => (r[c] == null ? 0 : (r[c] - m) / sd))
  })
  const basicOrder = T.map((_, i) =>
    Array.from(T.keys())
      .filter((j) => j !== i)
      .sort((a, b) => cols.reduce((s, c) => s + (c[i] - c[a]) ** 2, 0) - cols.reduce((s, c) => s + (c[i] - c[b]) ** 2, 0))
      .slice(0, 10),
  )
  const genres = T.map((t) => t.genre)
  const crates = T.map((t) => (t.crate ? `${t.genre}/${t.crate}` : null))
  const chance = (labels) => {
    const counts = new Map()
    labels.filter((l) => l != null).forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1))
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    return [...counts.values()].reduce((s, c) => s + (c / total) ** 2, 0)
  }
  const pct = (x) => Math.round(x * 100)

  return {
    clusters: info.map((x, c) => {
      const [hx, hy] = unit(hubs[c])
      return { id: c, label: x.label, n: x.n, x: hx, y: hy, styles: x.top.slice(0, 3) }
    }),
    report: {
      temas: n,
      grupos: clusters.length,
      raros: rare.filter(Boolean).length,
      sinGrupo: clusterOf.filter((c) => c == null).length,
      genero: { huella: pct(purity(soundOrder, genres)), conTags: pct(purity(order, genres)), simple: pct(purity(basicOrder, genres)), azar: pct(chance(genres)) },
      cajon: { huella: pct(purity(soundOrder, crates)), conTags: pct(purity(order, crates)), simple: pct(purity(basicOrder, crates)), azar: pct(chance(crates)) },
    },
  }
}
