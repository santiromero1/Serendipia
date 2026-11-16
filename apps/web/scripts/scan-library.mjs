#!/usr/bin/env node
/**
 * Escáner local de la biblioteca.
 *
 * Lee una carpeta de música (solo lectura) y genera:
 * (en .library-cache/data, que vite sirve en /data solo en desarrollo)
 *   library.json  temas con tags, género/cajón por carpeta, energía, bailabilidad, brillo y posición en el mapa
 *   peaks.json    forma de onda resumida por tema
 *   covers/       tapas a 320 px
 *
 * Uso:
 *   node scripts/scan-library.mjs [--dir ~/Music/MUSICA] [--xml ruta/rekordbox.xml] [--no-audio]
 *
 * Nunca escribe dentro de la carpeta de música ni toca la base de rekordbox.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFile } from 'music-metadata'
import { UMAP } from 'umap-js'
import { embed, loadEmbedder, SR as EMBED_SR } from './embed.mjs'
import { buildGalaxy } from './galaxy.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '..')
// fuera de public/: los datos personales nunca entran al build
const OUT = path.join(WEB, '.library-cache', 'data')
const COVERS = path.join(OUT, 'covers')
const CACHE_FILE = path.join(WEB, '.library-cache', 'features.json')
const EMBED_CACHE_FILE = path.join(WEB, '.library-cache', 'embeddings.json')

const args = process.argv.slice(2)
const argVal = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const expand = (p) => (p?.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p)
const MUSIC_DIR = path.resolve(expand(argVal('--dir') ?? process.env.SERENDIPIA_MUSIC_DIR ?? '~/Music/MUSICA'))
const XML_PATH = argVal('--xml') ? path.resolve(expand(argVal('--xml'))) : null
const NO_AUDIO = args.includes('--no-audio')
const AUDIO_EXT = new Set(['.mp3', '.aiff', '.aif', '.wav', '.m4a', '.aac', '.flac'])
const CONCURRENCY = Math.max(2, Math.min(6, os.cpus().length - 2))

// ───────────────────────── tonalidad ─────────────────────────
const MAJOR = { C: '8B', G: '9B', D: '10B', A: '11B', E: '12B', B: '1B', 'F#': '2B', Gb: '2B', Db: '3B', 'C#': '3B', Ab: '4B', 'G#': '4B', Eb: '5B', 'D#': '5B', Bb: '6B', 'A#': '6B', F: '7B' }
const MINOR = { A: '8A', E: '9A', B: '10A', 'F#': '11A', Gb: '11A', 'C#': '12A', Db: '12A', 'G#': '1A', Ab: '1A', 'D#': '2A', Eb: '2A', Bb: '3A', 'A#': '3A', F: '4A', C: '5A', G: '6A', D: '7A' }

export function toCamelot(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const cam = s.match(/^(\d{1,2})\s*([ABab])$/)
  if (cam) {
    const n = Number(cam[1])
    return n >= 1 && n <= 12 ? `${n}${cam[2].toUpperCase()}` : null
  }
  const m = s.match(/^([A-Ga-g])([#b♯♭]?)\s*(m|min|minor|maj|major)?$/i)
  if (!m) return null
  const note = m[1].toUpperCase() + m[2].replace('♯', '#').replace('♭', 'b')
  const minor = /^m(in|inor)?$/i.test(m[3] ?? '')
  return (minor ? MINOR : MAJOR)[note] ?? null
}

// ───────────────────────── archivos ─────────────────────────
async function walk(dir, out = []) {
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (AUDIO_EXT.has(path.extname(e.name).toLowerCase())) out.push(p)
  }
  return out
}

/** "Artista - Título (Mix) [Sello].ext" */
function parseFilename(file) {
  let base = path.basename(file, path.extname(file)).normalize('NFC')
  let label = null
  const lm = base.match(/\s*\[([^\]]+)\]\s*$/)
  if (lm) {
    label = lm[1].trim()
    base = base.slice(0, lm.index).trim()
  }
  const i = base.indexOf(' - ')
  if (i < 0) return { artist: null, title: base, label }
  return { artist: base.slice(0, i).trim(), title: base.slice(i + 3).trim(), label }
}

/** Cajón: "05 - DDTGS (dark deep trippy groovy shit)" → code DDTGS */
function parseCrate(folder) {
  if (!folder) return null
  const m = folder.match(/^(\d+)\s*-\s*(.+)$/)
  const name = (m ? m[2] : folder).trim()
  return { order: m ? Number(m[1]) : null, name, code: name.replace(/\s*\(.*\)\s*$/, '') }
}

function commentTags(comment) {
  if (!comment) return []
  return comment
    .split(' / ')
    .map((s) => s.trim())
    .filter((s) => /^Transitions\b/.test(s) || /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ]{2,19}$/.test(s))
}

/** Comentarios de Mixed In Key: "8A - 5" o "7A - Energy 6" */
function mixedInKey(comment) {
  const m = comment?.match(/\b(\d{1,2}[AB])\s*-\s*(?:Energy\s*)?(\d{1,2})\b/)
  return m ? { key: toCamelot(m[1]), energy: Number(m[2]) } : null
}

/** Lleva un BPM estimado al rango habitual de pista (90 a 180). */
function foldBpm(b) {
  if (!b) return null
  while (b < 90) b *= 2
  while (b >= 180) b /= 2
  return Math.round(b)
}

function run(cmd, argv, { maxBytes = 0 } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'ignore'] })
    const chunks = []
    let size = 0
    p.stdout.on('data', (c) => {
      size += c.length
      if (!maxBytes || size <= maxBytes) chunks.push(c)
    })
    p.on('error', () => resolve(null))
    p.on('close', (code) => resolve(code === 0 ? Buffer.concat(chunks) : null))
  })
}

// ───────────────────────── análisis de audio ─────────────────────────
const SR = 11025
const N = 1024
const HOP = 256
const HANN = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)))
const REV = (() => {
  const bits = Math.log2(N)
  const r = new Uint16Array(N)
  for (let i = 0; i < N; i++) {
    let x = i
    let y = 0
    for (let b = 0; b < bits; b++) {
      y = (y << 1) | (x & 1)
      x >>= 1
    }
    r[i] = y
  }
  return r
})()
const COS = Float32Array.from({ length: N / 2 }, (_, i) => Math.cos((2 * Math.PI * i) / N))
const SIN = Float32Array.from({ length: N / 2 }, (_, i) => Math.sin((2 * Math.PI * i) / N))

function fftMag(frame, re, im, mag) {
  for (let i = 0; i < N; i++) {
    re[REV[i]] = frame[i]
    im[REV[i]] = 0
  }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1
    const step = N / size
    for (let i = 0; i < N; i += size) {
      for (let j = 0, k = 0; j < half; j++, k += step) {
        const tr = re[i + j + half] * COS[k] + im[i + j + half] * SIN[k]
        const ti = im[i + j + half] * COS[k] - re[i + j + half] * SIN[k]
        re[i + j + half] = re[i + j] - tr
        im[i + j + half] = im[i + j] - ti
        re[i + j] += tr
        im[i + j] += ti
      }
    }
  }
  for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i], im[i])
}

/** Características crudas de un tema. Se normalizan después contra toda la biblioteca. */
function analyze(samples) {
  const total = samples.length
  // forma de onda: 240 picos de todo el tema
  const PEAKS = 240
  const peaks = new Array(PEAKS).fill(0)
  const per = Math.max(1, Math.floor(total / PEAKS))
  let globalMax = 1e-9
  for (let p = 0; p < PEAKS; p++) {
    let mx = 0
    const end = Math.min(total, (p + 1) * per)
    for (let i = p * per; i < end; i += 8) {
      const v = Math.abs(samples[i])
      if (v > mx) mx = v
    }
    peaks[p] = mx
    if (mx > globalMax) globalMax = mx
  }
  const peaks8 = peaks.map((v) => Math.round((v / globalMax) * 255))

  // cuerpo del tema: del 20% al 85%, sin intro ni outro de mezcla
  const start = Math.floor(total * 0.2)
  const end = Math.floor(total * 0.85)
  const frames = Math.floor((end - start - N) / HOP)
  if (frames < 200) return { peaks: peaks8, raw: null }

  const re = new Float32Array(N)
  const im = new Float32Array(N)
  const mag = new Float32Array(N / 2)
  const prev = new Float32Array(N / 2)
  const frame = new Float32Array(N)
  const flux = new Float32Array(frames)
  const kick = new Float32Array(frames)
  const loud = new Float32Array(frames)
  const binHz = SR / N
  const lowTop = Math.round(150 / binHz)
  const highFrom = Math.round(3500 / binHz)
  let centroidSum = 0
  let lowSum = 0
  let highSum = 0
  let allSum = 0
  let sq = 0

  for (let f = 0; f < frames; f++) {
    const off = start + f * HOP
    let e = 0
    for (let i = 0; i < N; i++) {
      const s = samples[off + i]
      frame[i] = s * HANN[i]
      e += s * s
    }
    sq += e
    loud[f] = Math.sqrt(e / N)
    fftMag(frame, re, im, mag)
    let fl = 0
    let flLow = 0
    let num = 0
    let den = 0
    for (let b = 1; b < N / 2; b++) {
      const m = mag[b]
      const lm = Math.log1p(m * 20)
      const d = lm - prev[b]
      if (d > 0) {
        fl += d
        if (b <= lowTop) flLow += d
      }
      prev[b] = lm
      num += b * m
      den += m
      if (b <= lowTop) lowSum += m
      else if (b >= highFrom) highSum += m
    }
    flux[f] = fl
    kick[f] = flLow
    centroidSum += den > 0 ? (num / den) * binHz : 0
    allSum += den
  }

  // claridad del pulso: autocorrelación de los golpes graves (bombo) entre 60 y 180 BPM
  let mean = 0
  let kmean = 0
  for (let f = 0; f < frames; f++) {
    mean += flux[f]
    kmean += kick[f]
  }
  mean /= frames
  kmean /= frames
  let var0 = 0
  for (let f = 0; f < frames; f++) var0 += (kick[f] - kmean) ** 2
  const fps = SR / HOP
  let best = 0
  let bestLag = 0
  for (let lag = Math.round((fps * 60) / 180); lag <= Math.round((fps * 60) / 60); lag++) {
    let ac = 0
    for (let f = 0; f + lag < frames; f++) ac += (kick[f] - kmean) * (kick[f + lag] - kmean)
    ac /= var0 || 1
    if (ac > best) {
      best = ac
      bestLag = lag
    }
  }

  // estabilidad: cuánto varía el volumen en ventanas de ~3 s (bajo = groove constante)
  const win = Math.round(fps * 3)
  const blocks = []
  for (let f = 0; f + win <= frames; f += win) {
    let s = 0
    for (let i = 0; i < win; i++) s += loud[f + i]
    blocks.push(s / win)
  }
  const bm = blocks.reduce((a, b) => a + b, 0) / (blocks.length || 1)
  const bsd = Math.sqrt(blocks.reduce((a, b) => a + (b - bm) ** 2, 0) / (blocks.length || 1))

  return {
    peaks: peaks8,
    raw: {
      loud: 20 * Math.log10(Math.sqrt(sq / (frames * N)) + 1e-9),
      flux: mean,
      centroid: centroidSum / frames,
      low: lowSum / (allSum || 1),
      high: highSum / (allSum || 1),
      pulse: best,
      bpmEst: bestLag ? (60 * fps) / bestLag : null,
      steady: 1 - Math.min(1, bsd / (bm || 1)),
    },
  }
}

async function decode(file, rate = SR) {
  const buf = await run('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-'])
  if (!buf || buf.length < rate * 4 * 20) return null
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4))
}

async function extractCover(file, dest) {
  if (fs.existsSync(dest)) return true
  await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-an', '-frames:v', '1', '-vf', 'scale=320:320:force_original_aspect_ratio=increase,crop=320:320', '-q:v', '4', dest])
  return fs.existsSync(dest)
}

// ───────────────────────── rekordbox XML (opcional) ─────────────────────────
function decodeXml(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
function attrs(tag) {
  const o = {}
  for (const m of tag.matchAll(/([A-Za-z]+)="([^"]*)"/g)) o[m[1]] = decodeXml(m[2])
  return o
}
function readRekordbox(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8')
  const byPath = new Map()
  const byId = new Map()
  for (const m of xml.matchAll(/<TRACK\s+TrackID="[^>]*?>/g)) {
    const a = attrs(m[0])
    if (!a.Location) continue
    let p
    try {
      p = decodeURIComponent(a.Location.replace(/^file:\/\/localhost/, '')).normalize('NFC')
    } catch {
      continue
    }
    const rec = {
      path: p,
      bpm: Number(a.AverageBpm) || null,
      key: toCamelot(a.Tonality),
      stars: a.Rating ? Math.round(Number(a.Rating) / 51) || null : null,
      comment: a.Comments || null,
    }
    byPath.set(p, rec)
    byId.set(a.TrackID, rec)
  }
  // playlists: árbol de <NODE>; las hojas (Type="1") listan <TRACK Key="id"/>
  const playlists = []
  const stack = []
  const body = xml.slice(xml.indexOf('<PLAYLISTS>'))
  for (const m of body.matchAll(/<NODE\s[^>]*?(\/?)>|<\/NODE>|<TRACK\s+Key="(\d+)"\s*\/>/g)) {
    if (m[0] === '</NODE>') stack.pop()
    else if (m[2]) stack[stack.length - 1]?.tracks?.push(byId.get(m[2])?.path)
    else {
      const a = attrs(m[0])
      const node = { name: a.Name, tracks: a.Type === '1' ? [] : null }
      if (node.tracks) playlists.push({ name: [...stack.map((s) => s.name).filter((n) => n && n !== 'ROOT'), a.Name].join(' / '), tracks: node.tracks })
      if (!m[1]) stack.push(node)
    }
  }
  return { byPath, playlists }
}

// ───────────────────────── normalización y mapa ─────────────────────────
function zscores(values) {
  const ok = values.filter((v) => v != null && Number.isFinite(v))
  const mean = ok.reduce((a, b) => a + b, 0) / (ok.length || 1)
  const sd = Math.sqrt(ok.reduce((a, b) => a + (b - mean) ** 2, 0) / (ok.length || 1)) || 1
  return values.map((v) => (v == null || !Number.isFinite(v) ? null : (v - mean) / sd))
}
/** Posición relativa dentro de la biblioteca, en escala 1 a 10. */
function rank10(values) {
  const idx = values.map((v, i) => [v, i]).filter(([v]) => v != null)
  idx.sort((a, b) => a[0] - b[0])
  const out = new Array(values.length).fill(null)
  idx.forEach(([, i], r) => {
    out[i] = Math.round((1 + (9 * r) / Math.max(1, idx.length - 1)) * 10) / 10
  })
  return out
}
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function pool(items, n, fn) {
  let i = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++
        await fn(items[idx], idx)
      }
    }),
  )
}

// ───────────────────────── principal ─────────────────────────
async function main() {
  if (!fs.existsSync(MUSIC_DIR)) {
    console.error(`No existe la carpeta de música: ${MUSIC_DIR}`)
    process.exit(1)
  }
  await fsp.mkdir(COVERS, { recursive: true })
  await fsp.mkdir(path.dirname(CACHE_FILE), { recursive: true })
  const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}
  const embCache = fs.existsSync(EMBED_CACHE_FILE) ? JSON.parse(fs.readFileSync(EMBED_CACHE_FILE, 'utf8')) : {}
  const embedder = NO_AUDIO ? null : await loadEmbedder()
  const rb = XML_PATH ? readRekordbox(XML_PATH) : null

  const files = (await walk(MUSIC_DIR)).sort()
  console.log(`${files.length} archivos de audio en ${MUSIC_DIR}`)

  const tracks = new Array(files.length)
  const peaksOut = {}
  let done = 0
  let analyzed = 0
  let embedded = 0

  await pool(files, CONCURRENCY, async (file, idx) => {
    const rel = path.relative(MUSIC_DIR, file).normalize('NFC')
    const id = createHash('sha1').update(rel).digest('hex').slice(0, 12)
    const st = await fsp.stat(file)
    const parts = rel.split(path.sep)
    const genre = parts.length > 1 ? parts[0] : 'Sin carpeta'
    const crate = parts.length > 2 ? parseCrate(parts[1]) : null
    const fn = parseFilename(file)

    let common = {}
    let format = {}
    try {
      ;({ common, format } = await parseFile(file, { duration: false, skipCovers: true }))
    } catch {
      /* archivo sin tags legibles: seguimos con el nombre */
    }
    const comment = (common.comment ?? []).map((c) => (typeof c === 'string' ? c : c?.text)).filter(Boolean).join(' / ')
    const x = rb?.byPath.get(file.normalize('NFC'))

    const key = `v2|${rel}|${st.size}|${Math.round(st.mtimeMs)}`
    let feat = cache[key]
    if (!feat && !NO_AUDIO) {
      const samples = await decode(file)
      feat = samples ? analyze(samples) : { peaks: null, raw: null }
      cache[key] = feat
      analyzed++
      if (analyzed % 25 === 0) fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))
    }
    // huella sonora: cómo suena el tema, sin mirar carpetas ni tags
    const ekey = `e1|${rel}|${st.size}|${Math.round(st.mtimeMs)}`
    let sound = embCache[ekey]
    if (sound === undefined && embedder) {
      const samples = await decode(file, EMBED_SR)
      sound = (samples && (await embed(samples))) || null
      embCache[ekey] = sound
      embedded++
      if (embedded % 50 === 0) fs.writeFileSync(EMBED_CACHE_FILE, JSON.stringify(embCache))
    }
    const cover = await extractCover(file, path.join(COVERS, `${id}.jpg`))

    const tagBpm = common.bpm && common.bpm > 40 ? common.bpm : null
    const mik = mixedInKey(comment)
    const fileKey = toCamelot(common.key) ?? mik?.key ?? null
    const bpmEst = foldBpm(feat?.raw?.bpmEst)
    tracks[idx] = {
      id,
      rel,
      title: fn.title || common.title || path.basename(file),
      artist: fn.artist || common.artist || 'Unknown',
      label: fn.label ?? common.label?.[0] ?? null,
      genre,
      crate: crate?.code ?? null,
      crateName: crate?.name ?? null,
      crateOrder: crate?.order ?? null,
      tagGenre: common.genre?.[0] ?? null,
      year: common.year ?? null,
      bpm: x?.bpm ?? tagBpm ?? bpmEst,
      bpmSource: x?.bpm ? 'rekordbox' : tagBpm ? 'archivo' : bpmEst ? 'estimado' : null,
      key: x?.key ?? fileKey,
      keySource: x?.key ? 'rekordbox' : fileKey ? 'archivo' : null,
      stars: x?.stars ?? null,
      mikEnergy: mik?.energy ?? null,
      tags: commentTags(x?.comment ?? comment),
      duration: format.duration ? Math.round(format.duration) : null,
      format: path.extname(file).slice(1).toLowerCase(),
      cover,
      added: Math.round(st.birthtimeMs || st.mtimeMs),
      _raw: feat?.raw ?? null,
      _emb: sound?.emb ?? null,
      _styles: sound?.styles ?? null,
    }
    if (feat?.peaks) peaksOut[id] = feat.peaks
    done++
    if (done % 50 === 0) console.log(`  ${done}/${files.length}`)
  })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))
  if (embedded) fs.writeFileSync(EMBED_CACHE_FILE, JSON.stringify(embCache))

  // escalas 1 a 10 relativas a la biblioteca
  const raw = (k) => tracks.map((t) => t._raw?.[k] ?? null)
  const zFlux = zscores(raw('flux'))
  const zLoud = zscores(raw('loud'))
  const zHigh = zscores(raw('high'))
  const zLow = zscores(raw('low'))
  const zPulse = zscores(raw('pulse'))
  const zSteady = zscores(raw('steady'))
  const zCent = zscores(raw('centroid'))
  const zBpm = zscores(tracks.map((t) => t.bpm))
  const mix = (...terms) => tracks.map((_, i) => (terms[0][0][i] == null ? null : terms.reduce((s, [z, w]) => s + (z[i] ?? 0) * w, 0)))
  const energy = rank10(mix([zFlux, 0.4], [zLoud, 0.25], [zHigh, 0.2], [zBpm, 0.15]))
  const dance = rank10(mix([zPulse, 0.4], [zFlux, 0.3], [zLow, 0.15], [zSteady, 0.15]))
  const bright = rank10(mix([zCent, 0.7], [zHigh, 0.3]))
  tracks.forEach((t, i) => {
    t.energy = t.stars ? t.stars * 2 : energy[i]
    t.energySource = t.stars ? 'estrellas' : energy[i] != null ? 'audio' : null
    t.dance = dance[i]
    t.bright = bright[i]
    delete t._raw
  })

  // mapa de respaldo (sin huella sonora): medidas simples + género + cajón
  const genres = [...new Set(tracks.map((t) => t.genre))]
  const crates = [...new Set(tracks.map((t) => `${t.genre}/${t.crate ?? ''}`))]
  const zE = zscores(energy)
  const zD = zscores(dance)
  const zB = zscores(bright)
  const vectors = tracks.map((t, i) => {
    const v = [zE[i] ?? 0, zD[i] ?? 0, zB[i] ?? 0, (zBpm[i] ?? 0) * 0.8]
    for (const g of genres) v.push(t.genre === g ? 1.15 : 0)
    for (const c of crates) v.push(`${t.genre}/${t.crate ?? ''}` === c ? 0.75 : 0)
    return v
  })
  if (tracks.length > 20) {
    const umap = new UMAP({ nComponents: 2, nNeighbors: Math.min(18, tracks.length - 1), minDist: 0.5, spread: 1.4, random: mulberry32(7) })
    const emb = umap.fit(vectors)
    const xs = emb.map((e) => e[0])
    const ys = emb.map((e) => e[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    tracks.forEach((t, i) => {
      t.x = Math.round(((emb[i][0] - x0) / (x1 - x0 || 1)) * 1000) / 1000
      t.y = Math.round(((emb[i][1] - y0) / (y1 - y0 || 1)) * 1000) / 1000
    })
  }

  // galaxia: posiciones, grupos y vecinos solo por cómo suena cada tema
  const galaxy = buildGalaxy(tracks)
  if (galaxy) {
    for (const t of tracks) if (!t._emb) delete t.x, delete t.y
    const r = galaxy.report
    console.log(`Galaxia: ${r.temas} temas en ${r.grupos} grupos · ${r.raros} raros · ${r.sinGrupo} sin grupo`)
    console.log(`  vecinos del mismo género: huella ${r.genero.huella}% · medidas simples ${r.genero.simple}% · azar ${r.genero.azar}%`)
    console.log(`  vecinos del mismo cajón:  huella ${r.cajon.huella}% · medidas simples ${r.cajon.simple}% · azar ${r.cajon.azar}%`)
    for (const c of galaxy.clusters) console.log(`  ${String(c.n).padStart(4)}  ${c.label}`)
  }
  for (const t of tracks) {
    delete t._emb
    delete t._styles
  }

  const idByPath = new Map(tracks.map((t) => [path.join(MUSIC_DIR, t.rel).normalize('NFC'), t.id]))
  const playlists = (rb?.playlists ?? [])
    .map((p) => ({ name: p.name, tracks: p.tracks.map((tp) => idByPath.get(tp)).filter(Boolean) }))
    .filter((p) => p.tracks.length)

  const library = {
    generatedAt: new Date().toISOString(),
    root: MUSIC_DIR,
    rekordbox: Boolean(rb),
    audioAnalysis: !NO_AUDIO,
    tracks,
    clusters: galaxy?.clusters ?? [],
    galaxy: galaxy?.report ?? null,
    playlists,
  }
  fs.writeFileSync(path.join(OUT, 'library.json'), JSON.stringify(library))
  fs.writeFileSync(path.join(OUT, 'peaks.json'), JSON.stringify(peaksOut))
  const withKey = tracks.filter((t) => t.key).length
  const withBpm = tracks.filter((t) => t.bpm).length
  const withFeat = tracks.filter((t) => t.energy != null).length
  console.log(`Listo: ${tracks.length} temas · con tonalidad ${withKey} · con BPM ${withBpm} · con análisis de audio ${withFeat} · ${analyzed} analizados ahora`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
