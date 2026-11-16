/**
 * Huella sonora de un tema con Discogs-EffNet (Essentia, MTG-UPF).
 *
 * El modelo fue entrenado con 4 millones de temas de Discogs para reconocer 400 estilos.
 * De cada tema sacamos:
 *   emb     vector de 1280 dimensiones: temas que suenan parecido quedan cerca (coseno)
 *   styles  los estilos más probables ("Progressive House", "Deep House"...)
 *
 * La entrada replica TensorflowInputMusiCNN de Essentia: 16 kHz, cuadros de 512 con salto
 * de 256, Hann, 96 bandas mel (Slaney, triángulos de área unitaria) sobre el espectro de
 * potencia, y log10(1 + 10000·x). El modelo recibe parches de 128 cuadros (~2 s).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BANDS, melPatches, PATCH, SR, summarize } from '../src/lib/sound/mel.js'

export { SR }

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const MODELS = path.resolve(HERE, '..', '.library-cache', 'models')
const MODEL_FILE = path.join(MODELS, 'discogs-effnet-bsdynamic-1.onnx')
const CLASSES_FILE = path.join(MODELS, 'genre_discogs400-discogs-effnet-1.json')
const BASE = 'https://essentia.upf.edu/models'

async function ensure(file, url) {
  if (fs.existsSync(file)) return
  fs.mkdirSync(path.dirname(file), { recursive: true })
  console.log(`Bajando ${path.basename(file)}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo bajar ${url}: ${res.status}`)
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
}

let ready = null
/** Carga el modelo una sola vez. Devuelve null si no se puede (sin red, sin onnxruntime). */
export function loadEmbedder() {
  ready ??= (async () => {
    try {
      const ort = await import('onnxruntime-node')
      await ensure(MODEL_FILE, `${BASE}/feature-extractors/discogs-effnet/discogs-effnet-bsdynamic-1.onnx`)
      await ensure(CLASSES_FILE, `${BASE}/classification-heads/genre_discogs400/genre_discogs400-discogs-effnet-1.json`)
      const session = await ort.InferenceSession.create(MODEL_FILE, { intraOpNumThreads: 2 })
      const classes = JSON.parse(fs.readFileSync(CLASSES_FILE, 'utf8')).classes
      return { ort, session, classes }
    } catch (e) {
      console.warn(`Sin huella sonora: ${e.message}`)
      return null
    }
  })()
  return ready
}

/**
 * @param {Float32Array} samples audio mono a 16 kHz
 * @returns {Promise<{ emb: number[], styles: [string, number][] } | null>}
 */
export async function embed(samples) {
  const m = await loadEmbedder()
  if (!m) return null
  const patches = melPatches(samples)
  if (!patches) return null
  const input = new m.ort.Tensor('float32', patches.data, [patches.count, PATCH, BANDS])
  const out = await m.session.run({ [m.session.inputNames[0]]: input })
  let acts = null
  let embs = null
  for (const name of m.session.outputNames) {
    const t = out[name]
    if (t.dims[1] === 400) acts = t.data
    else if (t.dims[1] === 1280) embs = t.data
  }
  if (!acts || !embs) throw new Error('El modelo no devolvió las salidas esperadas')
  return summarize(acts, embs, patches.count, m.classes)
}
