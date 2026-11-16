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

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const MODELS = path.resolve(HERE, '..', '.library-cache', 'models')
const MODEL_FILE = path.join(MODELS, 'discogs-effnet-bsdynamic-1.onnx')
const CLASSES_FILE = path.join(MODELS, 'genre_discogs400-discogs-effnet-1.json')
const BASE = 'https://essentia.upf.edu/models'

export const SR = 16000
const N = 512
const HOP = 256
const BANDS = 96
const PATCH = 128
const MAX_PATCHES = 40

const HANN = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)))
const BITS = Math.log2(N)
const REV = Uint16Array.from({ length: N }, (_, i) => {
  let y = 0
  for (let b = 0, x = i; b < BITS; b++, x >>= 1) y = (y << 1) | (x & 1)
  return y
})
const COS = Float32Array.from({ length: N / 2 }, (_, i) => Math.cos((2 * Math.PI * i) / N))
const SIN = Float32Array.from({ length: N / 2 }, (_, i) => Math.sin((2 * Math.PI * i) / N))

const hzToMel = (f) => (f < 1000 ? f / (200 / 3) : 15 + Math.log(f / 1000) / (Math.log(6.4) / 27))
const melToHz = (m) => (m < 15 ? m * (200 / 3) : 1000 * Math.exp((m - 15) * (Math.log(6.4) / 27)))

/** Banco de filtros mel como lista dispersa [bin, peso] por banda. */
const FILTERS = (() => {
  const top = hzToMel(SR / 2)
  const edges = Array.from({ length: BANDS + 2 }, (_, i) => melToHz((top * i) / (BANDS + 1)))
  const binHz = SR / 2 / (N / 2)
  return Array.from({ length: BANDS }, (_, b) => {
    const [lo, mid, hi] = [edges[b], edges[b + 1], edges[b + 2]]
    const norm = 2 / (hi - lo)
    const taps = []
    for (let k = Math.ceil(lo / binHz); k <= Math.floor(hi / binHz) && k <= N / 2; k++) {
      const f = k * binHz
      const w = f <= mid ? (f - lo) / (mid - lo) : (hi - f) / (hi - mid)
      if (w > 0) taps.push([k, w * norm])
    }
    return taps
  })
})()

function powerSpectrum(samples, off, re, im, out) {
  for (let i = 0; i < N; i++) {
    re[REV[i]] = samples[off + i] * HANN[i]
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
  for (let i = 0; i <= N / 2; i++) out[i] = re[i] * re[i] + im[i] * im[i]
}

/** Parches mel repartidos por el cuerpo del tema (del 15% al 90%). */
function melPatches(samples) {
  const start = Math.floor(samples.length * 0.15)
  const end = Math.floor(samples.length * 0.9)
  const patchSamples = (PATCH - 1) * HOP + N
  const available = Math.floor((end - start) / patchSamples)
  if (available < 1) return null
  const count = Math.min(MAX_PATCHES, available)
  const stride = (end - start - patchSamples) / Math.max(1, count - 1)
  const data = new Float32Array(count * PATCH * BANDS)
  const re = new Float32Array(N)
  const im = new Float32Array(N)
  const spec = new Float32Array(N / 2 + 1)
  for (let p = 0; p < count; p++) {
    const base = start + Math.floor(p * stride)
    for (let f = 0; f < PATCH; f++) {
      powerSpectrum(samples, base + f * HOP, re, im, spec)
      const row = (p * PATCH + f) * BANDS
      for (let b = 0; b < BANDS; b++) {
        let e = 0
        for (const [k, w] of FILTERS[b]) e += spec[k] * w
        data[row + b] = Math.log10(1 + 10000 * e)
      }
    }
  }
  return { data, count }
}

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
  const mean = (data, dim) => {
    const v = new Float64Array(dim)
    for (let p = 0; p < patches.count; p++) for (let i = 0; i < dim; i++) v[i] += data[p * dim + i]
    return Array.from(v, (x) => x / patches.count)
  }
  const a = mean(acts, 400)
  const styles = a
    .map((v, i) => [m.classes[i], Math.round(v * 1000) / 1000])
    .sort((x, y) => y[1] - x[1])
    .slice(0, 5)
  return { emb: mean(embs, 1280).map((x) => Math.round(x * 1e4) / 1e4), styles }
}
