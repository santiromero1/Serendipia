/**
 * Renderiza el video de presentación: scene.html cuadro por cuadro con Chrome, más el audio.
 *
 *   node render.mjs [--track "Aerocity"] [--from-bar 128] [--fps 30] [--preview]
 *
 * Usa las posiciones reales de la galaxia y playlists de la biblioteca local (.library-cache).
 * El resultado queda en out/, fuera del repo: incluye música con derechos, es para uso propio.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, 'out')
const FRAMES = path.join(OUT, 'frames')
const arg = (name, def) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : def
}
const FPS = Number(arg('--fps', 30))
const PREVIEW = process.argv.includes('--preview')
const lib = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'web', '.library-cache', 'data', 'library.json'), 'utf8'))

// música: el tramo empieza en un compás, 8 compases antes de donde vuelve el bombo
const song = lib.tracks.find((t) => t.title.toLowerCase().startsWith(arg('--track', 'Aerocity').toLowerCase()))
if (!song) throw new Error('No encuentro ese tema en la biblioteca')
const bpm = Math.round(song.bpm)
const BAR = (60 / bpm) * 4
const FIRST_BEAT = Number(arg('--first-beat', 0.179))
const start = FIRST_BEAT + Number(arg('--from-bar', 128)) * BAR

// datos de la escena
const placed = lib.tracks.filter((t) => t.x != null)
const index = new Map(placed.map((t, i) => [t.id, i]))
const byId = new Map(lib.tracks.map((t) => [t.id, t]))
const playlist = (name) => (lib.playlists.find((p) => p.name.includes(name))?.tracks ?? []).map((id) => byId.get(id)).filter((t) => t?.key)
const rule = (a, b) => {
  const p = (k) => ({ n: parseInt(k), l: k.slice(-1) })
  const [A, B] = [p(a), p(b)]
  const d = Math.min((A.n - B.n + 12) % 12, (B.n - A.n + 12) % 12)
  const s = A.l === B.l
  return (s && [0, 1, 2, 5].includes(d)) || (!s && [0, 3].includes(d))
}
const ok = (row) => row.every((t, i) => i === 0 || rule(row[i - 1].key, t.key))
const card = (t) => ({ title: t.title.replace(/ \((Original|Extended) Mix\)/, ''), artist: t.artist, key: t.key })
const organic = playlist('HR1')
const groove = playlist('HR2')
// la última fila tiene que estar bien en su orden final y chocar si se cruzan sus dos últimos temas
let peak = null
for (let i = groove.length - 5; i >= 5 && !peak; i--) {
  const w = groove.slice(i, i + 5)
  if (ok(w) && !ok([w[0], w[1], w[2], w[4], w[3]])) peak = w
}
if (!peak) throw new Error('No encontré una fila que sirva para mostrar el choque de tonalidad')
const rows = [organic.slice(0, 5), groove.slice(0, 5), peak].map((r) => r.map(card))

const big = [...(lib.clusters ?? [])].sort((a, b) => b.n - a.n)[1]
const focus = placed.find((t) => t.cluster === big.id && (t.nn?.length ?? 0) >= 3 && Math.hypot(t.x - big.x, t.y - big.y) > 0.03)
const near = [...new Set([...focus.nn, ...placed.filter((t) => t.cluster === big.id && t.id !== focus.id).sort((a, b) => Math.hypot(a.x - focus.x, a.y - focus.y) - Math.hypot(b.x - focus.x, b.y - focus.y)).map((t) => t.id)])].slice(0, 6)
const DATA = {
  bpm,
  tracks: placed.map((t) => ({ x: t.x, y: t.y, cluster: t.cluster ?? null })),
  clusters: lib.clusters.map((c) => ({ x: c.x, y: c.y, n: c.n, label: c.label })),
  rows,
  route: groove.map((t) => index.get(t.id)).filter((i) => i != null),
  focus: index.get(focus.id),
  near: near.map((id) => index.get(id)).filter((i) => i != null),
}

fs.rmSync(FRAMES, { recursive: true, force: true })
fs.mkdirSync(FRAMES, { recursive: true })
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--force-device-scale-factor=1'] })
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080 })
await page.evaluateOnNewDocument((d) => (window.DATA = d), DATA)
await page.goto('file://' + path.join(HERE, 'scene.html'), { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts.ready)
const { events, duration } = await page.evaluate(() => window.events())

if (PREVIEW) {
  // un cuadro por escena, para revisar el diseño sin renderizar todo
  for (const t of arg('--at', '3,9,14.5,17,22,27,33,40,43.5,47,51').split(',').map(Number)) {
    await page.evaluate((x) => window.render(x), t)
    await page.screenshot({ path: path.join(OUT, `preview-${String(t).padStart(4, '0')}.png`) })
  }
  await browser.close()
  console.log(`Vistas previas en ${OUT} · duración ${duration.toFixed(1)} s`)
  process.exit(0)
}

const total = Math.round(duration * FPS)
for (let f = 0; f < total; f++) {
  await page.evaluate((x) => window.render(x), f / FPS)
  await page.screenshot({ path: path.join(FRAMES, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 })
  if (f % 150 === 0) console.log(`cuadro ${f} de ${total}`)
}
await browser.close()

// sonidos de interfaz, sintetizados
const run = (argv) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...argv], { stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.status !== 0) throw new Error('ffmpeg falló')
}
const SFX = {
  click: 'sine=f=2100:d=0.045,afade=t=out:st=0.004:d=0.04,volume=0.5',
  tick: 'sine=f=3200:d=0.03,afade=t=out:st=0.002:d=0.028,volume=0.35',
  pop: 'sine=f=620:d=0.12,afade=t=out:st=0.01:d=0.11,volume=0.55',
  warn: 'sine=f=150:d=0.4,afade=t=out:st=0.05:d=0.35,volume=0.9',
}
for (const [name, f] of Object.entries(SFX)) run(['-f', 'lavfi', '-i', f, '-ar', '44100', '-ac', '2', path.join(OUT, `${name}.wav`)])
const inputs = ['-ss', start.toFixed(3), '-t', duration.toFixed(3), '-i', path.join(lib.root, song.rel)]
const chains = [`[0:a]aresample=44100,afade=t=in:d=0.8,afade=t=out:st=${(duration - 2.5).toFixed(2)}:d=2.5,volume=0.9[m]`]
events.forEach((e, i) => {
  inputs.push('-i', path.join(OUT, `${e.s}.wav`))
  chains.push(`[${i + 1}:a]adelay=${Math.round(e.t * 1000)}:all=1[s${i}]`)
})
chains.push(`[m]${events.map((_, i) => `[s${i}]`).join('')}amix=inputs=${events.length + 1}:normalize=0:duration=first,alimiter=limit=0.95[a]`)
run([...inputs, '-filter_complex', chains.join(';'), '-map', '[a]', path.join(OUT, 'audio.wav')])
run(['-framerate', String(FPS), '-i', path.join(FRAMES, 'f%05d.jpg'), '-i', path.join(OUT, 'audio.wav'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', path.join(OUT, 'serendipia.mp4')])
fs.rmSync(FRAMES, { recursive: true, force: true })
console.log(`Listo: ${path.join(OUT, 'serendipia.mp4')} · ${duration.toFixed(1)} s · música desde ${start.toFixed(1)} s de ${song.title}`)
