/**
 * Baja el modelo de sonido a public/models para que la versión web pueda analizar en el navegador.
 * No va al repo: se baja en cada build. Modelo Discogs-EffNet de Essentia (MTG-UPF), CC BY-NC-SA 4.0.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models')
const BASE = 'https://essentia.upf.edu/models'
const FILES = {
  'discogs-effnet.onnx': `${BASE}/feature-extractors/discogs-effnet/discogs-effnet-bsdynamic-1.onnx`,
  'discogs-genres.json': `${BASE}/classification-heads/genre_discogs400/genre_discogs400-discogs-effnet-1.json`,
}
fs.mkdirSync(OUT, { recursive: true })
for (const [name, url] of Object.entries(FILES)) {
  const dest = path.join(OUT, name)
  if (fs.existsSync(dest)) continue
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo bajar ${url}: ${res.status}`)
  let buf = Buffer.from(await res.arrayBuffer())
  if (name.endsWith('.json')) buf = Buffer.from(JSON.stringify(JSON.parse(buf.toString()).classes))
  fs.writeFileSync(dest, buf)
  console.log(`${name} ${(buf.length / 1e6).toFixed(1)} MB`)
}
