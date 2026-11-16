import type { Marks, Track } from './types'
import { keyRule, type KeyRule } from './harmony'

const gap = (a: number | null, b: number | null, span: number) =>
  a == null || b == null ? 0.5 : Math.min(1, Math.abs(a - b) / span)

/** Mismas reglas que scripts/galaxy.mjs: el género del tag cuenta solo si dice algo, y el sello va sin sufijos. */
function genreKey(tag: string | null): string | null {
  const g = tag?.trim().toLowerCase()
  if (!g || g.includes(';') || /^(electro|dance|music|electronica|electronic|other|otro|unknown)$/.test(g)) return null
  return g.replace(/\s*[/&]\s*/g, ' & ')
}
const labelKey = (label: string | null) => label?.trim().toLowerCase().replace(/\s+(records?|recordings|music|musik|digital)$/g, '') || null
const sameTag = (a: string | null, b: string | null) => a != null && a === b

const decoded = new Map<string, Float32Array>()
/** Huella sonora del tema, normalizada. */
function fingerprint(t: Track): Float32Array | null {
  if (!t.emb) return null
  let v = decoded.get(t.emb)
  if (!v) {
    const bin = atob(t.emb)
    v = new Float32Array(bin.length)
    let norm = 0
    for (let i = 0; i < bin.length; i++) {
      const x = (bin.charCodeAt(i) << 24) >> 24
      v[i] = x
      norm += x * x
    }
    norm = Math.sqrt(norm) || 1
    for (let i = 0; i < v.length; i++) v[i] /= norm
    decoded.set(t.emb, v)
  }
  return v
}

/**
 * Distancia entre dos temas, 0 (iguales) a ~1.5.
 * Con huella sonora: 1 − coseno entre huellas, acercando a los que comparten género del tag o sello, más un poco de BPM. No mira carpetas.
 * Sin huella: energía, bailabilidad, brillo y BPM, más una penalidad por género y cajón distintos.
 */
export function distance(a: Track, b: Track): number {
  const fa = fingerprint(a)
  const fb = fingerprint(b)
  if (fa && fb) {
    let dot = 0
    for (let i = 0; i < fa.length; i++) dot += fa[i] * fb[i]
    const tags = (sameTag(genreKey(a.tagGenre), genreKey(b.tagGenre)) ? 0.25 : 0) + (sameTag(labelKey(a.label), labelKey(b.label)) ? 0.2 : 0)
    return Math.max(0, 1 - dot - tags) + gap(a.bpm, b.bpm, 12) * 0.15
  }
  const sound = Math.sqrt(
    (gap(a.energy, b.energy, 9) ** 2 * 1.2 +
      gap(a.dance, b.dance, 9) ** 2 +
      gap(a.bright, b.bright, 9) ** 2 +
      gap(a.bpm, b.bpm, 12) ** 2 * 0.8) /
      4,
  )
  const place = a.genre !== b.genre ? 0.45 : a.crate !== b.crate ? 0.14 : 0
  return sound + place
}

export interface Suggestion {
  track: Track
  score: number
  rule?: KeyRule | null
  bpmDiff?: number | null
}

/** Parecidos al conjunto, sin importar el orden. */
export function matching(seed: Track[], pool: Track[], limit = 24): Suggestion[] {
  if (!seed.length) return []
  return pool
    .map((t) => ({ track: t, score: 1 - seed.reduce((s, m) => s + distance(t, m), 0) / seed.length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Vecinos más cercanos de un tema. */
export function neighbors(of: Track, pool: Track[], limit = 8): Suggestion[] {
  return matching([of], pool.filter((t) => t.id !== of.id), limit)
}

/**
 * Qué puede seguir a un tema: tonalidad compatible según las reglas del usuario,
 * BPM cercano, y sonido parecido con leve preferencia por subir la energía.
 */
export function nextTracks(last: Track, pool: Track[], limit = 24): Suggestion[] {
  const out: Suggestion[] = []
  for (const t of pool) {
    if (t.id === last.id) continue
    const bpmDiff = last.bpm != null && t.bpm != null ? t.bpm - last.bpm : null
    if (bpmDiff != null && Math.abs(bpmDiff) > 6) continue
    const rule = keyRule(last.key, t.key)
    const bothKeys = last.key != null && t.key != null
    if (bothKeys && !rule) continue
    const keyScore = rule ? rule.score : 0.35
    const bpmScore = bpmDiff == null ? 0.5 : 1 - Math.abs(bpmDiff) / 6
    const lift = last.energy != null && t.energy != null ? t.energy - last.energy : 0
    const liftScore = lift >= -0.5 && lift <= 2 ? 1 : Math.max(0, 1 - Math.abs(lift - 0.75) / 5)
    const score = keyScore * 0.4 + bpmScore * 0.2 + (1 - Math.min(1, distance(last, t))) * 0.3 + liftScore * 0.1
    out.push({ track: t, score, rule, bpmDiff })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Energía para ordenar dentro de un set: si casi todo el set tiene estrellas, mandan las estrellas (el DJ las puso pensando en ese set). */
function setEnergy(tracks: Track[]): (t: Track) => number {
  const starred = tracks.filter((t) => t.stars != null).length >= tracks.length * 0.6
  return (t) => (starred && t.stars != null ? t.stars * 2 : (t.energy ?? 5))
}

/**
 * Ordena una playlist de menos a más encadenando tonalidades compatibles y respetando las marcas del set:
 * el que abre va primero, el que cierra último, los peak hacia el final, los que van juntos quedan pegados
 * y los extras se apartan al final, de más a menos energía.
 */
export function arrange(tracks: Track[], marks: Marks = {}): Track[] {
  const mark = (t: Track) => marks[t.id] ?? {}
  const base = setEnergy(tracks)
  const energy = (t: Track) => (mark(t).role === 'peak' ? 11 : base(t))
  const extras = tracks.filter((t) => mark(t).extra).sort((a, b) => base(b) - base(a))
  const main = tracks.filter((t) => !mark(t).extra)
  if (main.length < 2) return [...main, ...extras]

  // bloques: los temas marcados "junto a" se mueven como uno solo
  const ids = new Set(main.map((t) => t.id))
  const parent = new Map(main.map((t) => [t.id, t.id]))
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!))
  for (const t of main) {
    const w = mark(t).with
    if (w && ids.has(w)) parent.set(find(t.id), find(w))
  }
  const grouped = new Map<string, Track[]>()
  for (const t of main) grouped.set(find(t.id), [...(grouped.get(find(t.id)) ?? []), t])
  const blocks = [...grouped.values()].map((ts) => {
    const sorted = [...ts].sort((a, b) => energy(a) - energy(b))
    return {
      tracks: sorted,
      first: sorted[0],
      last: sorted[sorted.length - 1],
      energy: sorted.reduce((s, t) => s + energy(t), 0) / sorted.length,
      open: sorted.some((t) => mark(t).role === 'open'),
      close: sorted.some((t) => mark(t).role === 'close'),
    }
  })
  const opener = blocks.find((b) => b.open)
  const closer = blocks.find((b) => b.close && b !== opener)
  const rest = blocks.filter((b) => b !== opener && b !== closer).sort((a, b) => a.energy - b.energy)
  const out = [opener ?? rest.shift()!]
  while (rest.length) {
    const last = out[out.length - 1]
    let best = 0
    let bestScore = -Infinity
    rest.forEach((b, i) => {
      const rule = keyRule(last.last.key, b.first.key)
      // un choque de tonalidad solo se acepta si no queda ningún tema compatible
      const keyScore = rule ? rule.score : last.last.key && b.first.key ? -4 : 0.3
      // i es la posición en el orden por energía: cuanto antes, menos salto
      const score = keyScore * 1.2 - Math.abs(b.energy - last.energy) * 0.12 - i * 0.04 - gap(last.last.bpm, b.first.bpm, 8) * 0.4
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    })
    out.push(rest.splice(best, 1)[0])
  }
  if (closer) out.push(closer)
  return [...out.flatMap((b) => b.tracks), ...extras]
}

/** Cuánto suena un tema dentro de una mezcla: se pisa con el anterior y el siguiente. */
export const played = (t: Track) => (t.duration ?? 360) * 0.8

/**
 * Qué temas pasar a extras para que la playlist dure `minutes` en mezcla.
 * Nunca toca los sí o sí, los que tienen rol ni los que van pegados a otro, y prefiere
 * sacar los que dejan una unión válida entre sus vecinos.
 */
export function trimToMinutes(ordered: Track[], marks: Marks, minutes: number): string[] {
  const mark = (t: Track) => marks[t.id] ?? {}
  const linked = new Set(ordered.map((t) => mark(t).with).filter(Boolean))
  const main = ordered.filter((t) => !mark(t).extra)
  const removed: string[] = []
  let total = main.reduce((s, t) => s + played(t), 0)
  while (total > minutes * 60) {
    let best = -1
    let bestScore = -Infinity
    main.forEach((t, i) => {
      const m = mark(t)
      if (m.must || m.role || m.with || linked.has(t.id)) return
      const prev = main[i - 1]
      const next = main[i + 1]
      const rule = prev && next ? keyRule(prev.key, next.key) : null
      const score = !prev || !next ? 0.4 : rule ? rule.score : prev.key && next.key ? -1 : 0.3
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    })
    if (best < 0) break
    total -= played(main[best])
    removed.push(main.splice(best, 1)[0].id)
  }
  return removed
}

export const magicSort = (tracks: Track[]) => arrange(tracks)
