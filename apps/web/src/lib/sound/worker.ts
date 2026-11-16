/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web'
import { BANDS, melPatches, PATCH, summarize } from './mel.js'
import { buildGalaxy } from './galaxy.js'

/**
 * Análisis de sonido fuera del hilo de la interfaz: huella por tema con Discogs-EffNet
 * (modelo de Essentia, MTG-UPF, CC BY-NC-SA 4.0) y armado de la galaxia.
 */
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`
ort.env.wasm.numThreads = 1

/** En el navegador se usan menos parches que en el escáner local: alcanza y es más del doble de rápido. */
const PATCHES = 16

let ready: Promise<{ session: ort.InferenceSession; classes: string[] }> | null = null
const load = () =>
  (ready ??= (async () => {
    const [session, classes] = await Promise.all([
      ort.InferenceSession.create('/models/discogs-effnet.onnx', { executionProviders: ['wasm'] }),
      fetch('/models/discogs-genres.json').then((r) => r.json() as Promise<string[]>),
    ])
    return { session, classes }
  })())

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  try {
    if (msg.type === 'load') {
      await load()
      postMessage({ id: msg.id, ok: true })
    } else if (msg.type === 'embed') {
      const { session, classes } = await load()
      const patches = melPatches(msg.samples as Float32Array, PATCHES)
      if (!patches) return postMessage({ id: msg.id, result: null })
      const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', patches.data, [patches.count, PATCH, BANDS]) })
      let acts: Float32Array | null = null
      let embs: Float32Array | null = null
      for (const name of session.outputNames) {
        const t = out[name]
        if (t.dims[1] === 400) acts = t.data as Float32Array
        else if (t.dims[1] === 1280) embs = t.data as Float32Array
      }
      postMessage({ id: msg.id, result: acts && embs ? summarize(acts, embs, patches.count, classes) : null })
    } else if (msg.type === 'galaxy') {
      const tracks = msg.tracks as Record<string, unknown>[]
      const galaxy = buildGalaxy(tracks)
      postMessage({
        id: msg.id,
        result: galaxy && {
          clusters: galaxy.clusters,
          report: galaxy.report,
          tracks: tracks.filter((t) => t._emb).map((t) => ({ id: t.id, x: t.x, y: t.y, cluster: t.cluster, style: t.style, emb: t.emb, nn: t.nn })),
        },
      })
    }
  } catch (err) {
    postMessage({ id: msg.id, error: err instanceof Error ? err.message : String(err) })
  }
}
