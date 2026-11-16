/**
 * Bandeja de descargas (solo local).
 *
 * Lista los temas nuevos de la carpeta de descargas, sugiere a qué carpeta y cajón de la
 * biblioteca van (por parecido sonoro con lo que ya hay en cada cajón) y, cuando el DJ lo
 * confirma tema por tema, mueve y renombra el archivo. Nunca borra: descartar manda a la Papelera.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFile } from 'music-metadata'
import { embed, SR } from './embed.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CACHE = path.resolve(HERE, '..', '.library-cache')
const LIBRARY = path.join(CACHE, 'data', 'library.json')
const EMBEDDINGS = path.join(CACHE, 'embeddings.json')
const INBOX_CACHE = path.join(CACHE, 'inbox.json')
export const DOWNLOADS = path.resolve(process.env.SERENDIPIA_INBOX_DIR ?? path.join(os.homedir(), 'Downloads'))
const AUDIO_EXT = new Set(['.mp3', '.aiff', '.aif', '.wav', '.m4a'])
const K = 12

const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(original mix\)|\(extended mix\)|\[[^\]]*\]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

async function walk(dir, depth, out = []) {
  let entries = []
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (depth > 0) await walk(p, depth - 1, out)
    } else if (AUDIO_EXT.has(path.extname(e.name).toLowerCase())) out.push(p)
  }
  return out
}

function decode(file) {
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { stdio: ['ignore', 'pipe', 'ignore'] })
    const chunks = []
    p.stdout.on('data', (c) => chunks.push(c))
    p.on('error', () => resolve(null))
    p.on('close', (code) => {
      const buf = Buffer.concat(chunks)
      resolve(code === 0 && buf.length > SR * 4 * 20 ? new Float32Array(buf.buffer, buf.byteOffset, buf.length >> 2) : null)
    })
  })
}

/** Biblioteca con huellas centradas, y las carpetas reales de cada cajón. */
let libState = null
function loadLibrary() {
  const mtime = fs.statSync(LIBRARY).mtimeMs
  if (libState?.mtime === mtime) return libState
  const lib = JSON.parse(fs.readFileSync(LIBRARY, 'utf8'))
  const cache = fs.existsSync(EMBEDDINGS) ? JSON.parse(fs.readFileSync(EMBEDDINGS, 'utf8')) : {}
  const byRel = new Map(Object.entries(cache).map(([k, v]) => [k.split('|')[1], v]))
  const tracks = lib.tracks.filter((t) => byRel.get(t.rel)?.emb && !t.crate?.startsWith('SET'))
  const d = tracks.length ? byRel.get(tracks[0].rel).emb.length : 0
  const mean = new Float64Array(d)
  for (const t of tracks) byRel.get(t.rel).emb.forEach((x, i) => (mean[i] += x / tracks.length))
  const unit = (emb) => {
    const v = Float32Array.from(emb, (x, i) => x - mean[i])
    const n = Math.hypot(...v) || 1
    return v.map((x) => x / n)
  }
  // destinos: carpeta raíz y subcarpeta tal como existen en disco
  const places = new Map()
  for (const t of lib.tracks) {
    const parts = t.rel.split('/')
    if (parts.length < 2 || t.crate?.startsWith('SET')) continue
    const dir = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0]
    const p = places.get(dir) ?? { dir, genre: t.genre, crate: parts.length > 2 ? t.crate : null, n: 0 }
    p.n++
    places.set(dir, p)
  }
  libState = {
    mtime,
    root: lib.root,
    tracks,
    vectors: tracks.map((t) => unit(byRel.get(t.rel).emb)),
    dirOf: tracks.map((t) => t.rel.split('/').slice(0, -1).join('/')),
    unit,
    places: [...places.values()].sort((a, b) => a.dir.localeCompare(b.dir)),
    known: new Map(lib.tracks.map((t) => [`${norm(t.artist)}|${norm(t.title)}`, t])),
  }
  return libState
}

/** "Artista - Título (Mix) [Sello]": la convención de nombres de la biblioteca. */
function proposeName(file, common) {
  const ext = path.extname(file).toLowerCase()
  const base = path.basename(file, path.extname(file))
  const clean = (s) => s.replace(/[/\\:]/g, '-').replace(/\s+/g, ' ').trim()
  const artist = common.artists?.length ? common.artists.join(', ') : common.artist
  if (!artist || !common.title) return clean(base) + ext
  let title = common.title
  // artista repetido en el título: "Your Face feat. X" queda como está, "X - Título" no
  if (title.toLowerCase().startsWith(artist.toLowerCase() + ' - ')) title = title.slice(artist.length + 3)
  const label = common.label?.[0]
  return clean(`${artist} - ${title}${label ? ` [${label}]` : ''}`) + ext
}

let inboxCache = null
const readCache = () => (inboxCache ??= fs.existsSync(INBOX_CACHE) ? JSON.parse(fs.readFileSync(INBOX_CACHE, 'utf8')) : {})

async function describe(file) {
  const st = await fsp.stat(file)
  const key = `${file}|${st.size}|${Math.round(st.mtimeMs)}`
  const cache = readCache()
  if (!cache[key]) {
    let common = {}
    let format = {}
    try {
      ;({ common, format } = await parseFile(file, { duration: true, skipCovers: true }))
    } catch {
      /* sin tags: se usa el nombre */
    }
    const samples = await decode(file)
    const sound = samples ? await embed(samples) : null
    const comment = (common.comment ?? []).map((c) => (typeof c === 'string' ? c : c?.text)).filter(Boolean).join(' / ')
    cache[key] = {
      title: common.title ?? path.basename(file, path.extname(file)),
      artist: (common.artists?.length ? common.artists.join(', ') : common.artist) ?? null,
      label: common.label?.[0] ?? null,
      tagGenre: common.genre?.[0] ?? null,
      bpm: common.bpm ?? null,
      key: common.key ?? null,
      comment: /purchased at|beatport/i.test(comment) ? null : comment || null,
      duration: format.duration ? Math.round(format.duration) : null,
      name: proposeName(file, common),
      emb: sound?.emb ?? null,
      style: sound?.styles?.[0]?.[0].split('---').pop() ?? null,
    }
    fs.writeFileSync(INBOX_CACHE, JSON.stringify(cache))
  }
  return { ...cache[key], size: st.size, added: Math.round(st.mtimeMs) }
}

function suggest(info, lib) {
  if (!info.emb || !lib.tracks.length) return { options: [], neighbors: [] }
  const v = lib.unit(info.emb)
  const sims = lib.vectors
    .map((u, i) => {
      let s = 0
      for (let k = 0; k < u.length; k++) s += u[k] * v[k]
      return [s, i]
    })
    .sort((a, b) => b[0] - a[0])
    .slice(0, K)
  const votes = new Map()
  for (const [s, i] of sims) votes.set(lib.dirOf[i], (votes.get(lib.dirOf[i]) ?? 0) + Math.max(0, s))
  // mismo artista ya en la biblioteca: empuja hacia donde está el resto
  const artist = norm(info.artist)
  if (artist) lib.tracks.forEach((t, i) => norm(t.artist) === artist && votes.set(lib.dirOf[i], (votes.get(lib.dirOf[i]) ?? 0) + 0.35))
  const total = [...votes.values()].reduce((a, b) => a + b, 0) || 1
  return {
    options: [...votes].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([dir, w]) => ({ dir, share: Math.round((w / total) * 100) })),
    neighbors: sims.slice(0, 5).map(([s, i]) => ({ id: lib.tracks[i].id, title: lib.tracks[i].title, artist: lib.tracks[i].artist, dir: lib.dirOf[i], sim: Math.round(s * 100) / 100 })),
  }
}

const tokenOf = (file) => Buffer.from(file).toString('base64url')
const fileOf = (token) => {
  const file = path.resolve(Buffer.from(token, 'base64url').toString())
  if (!file.startsWith(DOWNLOADS + path.sep) || !AUDIO_EXT.has(path.extname(file).toLowerCase()) || !fs.existsSync(file)) throw new Error('Archivo fuera de la bandeja')
  return file
}
export const inboxFile = fileOf

/** Lista de archivos de la bandeja, sin analizar (rápido). */
export async function listInbox() {
  const lib = loadLibrary()
  const files = (await walk(DOWNLOADS, 2)).filter((f) => !f.startsWith(lib.root + path.sep))
  return { dir: DOWNLOADS, root: lib.root, places: lib.places, files: files.map((f) => ({ token: tokenOf(f), rel: path.relative(DOWNLOADS, f) })) }
}

/** Análisis de un archivo: tags, nombre propuesto, destinos sugeridos, duplicado. */
export async function inspect(token) {
  const file = fileOf(token)
  const lib = loadLibrary()
  const info = await describe(file)
  const dup = lib.known.get(`${norm(info.artist)}|${norm(info.title)}`)
  const { emb, ...rest } = info
  return {
    token,
    rel: path.relative(DOWNLOADS, file),
    format: path.extname(file).slice(1).toLowerCase(),
    analyzed: !!emb,
    ...rest,
    ...suggest(info, lib),
    duplicate: dup ? { id: dup.id, rel: dup.rel, format: dup.format } : null,
  }
}

/** Mueve un tema a su cajón con el nombre elegido. No pisa archivos existentes. */
export async function moveToLibrary(token, dir, name) {
  const file = fileOf(token)
  const lib = loadLibrary()
  if (!lib.places.some((p) => p.dir === dir)) throw new Error('Ese destino no existe en la biblioteca')
  const safe = path.basename(String(name)).replace(/[/\\:]/g, '-').trim()
  if (!safe || !AUDIO_EXT.has(path.extname(safe).toLowerCase())) throw new Error('Nombre de archivo inválido')
  const dest = path.join(lib.root, dir, safe)
  if (fs.existsSync(dest)) throw new Error(`Ya existe ${safe} en ${dir}`)
  try {
    await fsp.rename(file, dest)
  } catch (e) {
    if (e.code !== 'EXDEV') throw e
    await fsp.copyFile(file, dest, fs.constants.COPYFILE_EXCL)
    await fsp.unlink(file)
  }
  return { rel: `${dir}/${safe}` }
}

/** Descartar: a la Papelera, nunca borrado definitivo. */
export async function trash(token) {
  const file = fileOf(token)
  const bin = path.join(os.homedir(), '.Trash')
  let dest = path.join(bin, path.basename(file))
  if (fs.existsSync(dest)) dest = path.join(bin, `${path.basename(file, path.extname(file))} ${Date.now()}${path.extname(file)}`)
  await fsp.rename(file, dest)
  return { ok: true }
}
