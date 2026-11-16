import type { Cluster, GalaxyReport, Library, Track } from '@/lib/types'
import { db } from '@/lib/db'
import { decodeTo16k } from './decode'

/** Archivos que el DJ eligió en esta sesión, por id de tema. Sirven para analizar y para escuchar. */
export const localFiles = new Map<string, File>()

interface Sound {
  size: number
  emb: Float32Array
  styles: [string, number][]
}
export interface Progress {
  phase: 'modelo' | 'temas' | 'mapa'
  done: number
  total: number
  current: string
  matched: number
  failed: number
}

const AUDIO = /\.(mp3|aiff?|wav|m4a|aac|flac)$/i
const nfc = (s: string) => s.normalize('NFC')

/** Empareja los archivos elegidos con los temas de la biblioteca: por ruta relativa y, si no, por nombre de archivo. */
export function matchFiles(tracks: Track[], files: File[]): Map<string, File> {
  const byRel = new Map(tracks.map((t) => [nfc(t.rel), t.id]))
  const names = new Map<string, string | null>()
  for (const t of tracks) {
    const name = nfc(t.rel.split('/').pop()!)
    names.set(name, names.has(name) ? null : t.id)
  }
  const out = new Map<string, File>()
  for (const f of files) {
    if (!AUDIO.test(f.name)) continue
    const rel = nfc(f.webkitRelativePath || f.name)
    // la carpeta elegida es la raíz de la biblioteca: su nombre es el primer tramo de la ruta
    const id = byRel.get(rel.split('/').slice(1).join('/')) ?? byRel.get(rel) ?? names.get(nfc(f.name))
    if (id && !out.has(id)) out.set(id, f)
  }
  return out
}

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
function call<T>(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id)
      if (!p) return
      pending.delete(e.data.id)
      if (e.data.error) p.reject(new Error(e.data.error))
      else p.resolve(e.data.result)
    }
  }
  const id = ++seq
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker!.postMessage({ ...msg, id }, transfer)
  })
}

/**
 * Analiza en el navegador los temas elegidos y arma la galaxia.
 * Las huellas se guardan en este navegador: la próxima vez solo se analizan los temas nuevos.
 */
export async function analyzeLibrary(lib: Library, files: File[], onProgress: (p: Progress) => void, cancelled: () => boolean): Promise<Library> {
  const matched = matchFiles(lib.tracks, files)
  for (const [id, f] of matched) localFiles.set(id, f)
  if (!matched.size) throw new Error('Ningún archivo de esa carpeta coincide con los temas del XML. Elegí la carpeta donde está tu música.')

  const store = await db()
  const todo = [...matched].filter(([, f]) => AUDIO.test(f.name))
  const p: Progress = { phase: 'modelo', done: 0, total: todo.length, current: '', matched: matched.size, failed: 0 }
  onProgress({ ...p })
  await call({ type: 'load' })

  p.phase = 'temas'
  for (const [id, file] of todo) {
    if (cancelled()) break
    p.current = file.name
    onProgress({ ...p })
    const have = (await store.get('sound', id)) as Sound | undefined
    if (!have || have.size !== file.size) {
      try {
        const samples = await decodeTo16k(file)
        const res = samples && (await call<{ emb: number[]; styles: [string, number][] } | null>({ type: 'embed', samples }, [samples.buffer]))
        if (res) await store.put('sound', { size: file.size, emb: Float32Array.from(res.emb), styles: res.styles } satisfies Sound, id)
        else p.failed++
      } catch {
        p.failed++
      }
    }
    p.done++
  }

  p.phase = 'mapa'
  p.current = ''
  onProgress({ ...p })
  const input = []
  for (const t of lib.tracks) {
    const s = (await store.get('sound', t.id)) as Sound | undefined
    input.push({ id: t.id, genre: t.genre, crate: t.crate, tagGenre: t.tagGenre, label: t.label, energy: t.energy, dance: t.dance, bright: t.bright, bpm: t.bpm, _emb: s ? Array.from(s.emb) : null, _styles: s?.styles ?? null })
  }
  const g = await call<{ clusters: Cluster[]; report: GalaxyReport; tracks: Partial<Track>[] } | null>({ type: 'galaxy', tracks: input })
  if (!g) throw new Error(`Hacen falta al menos 30 temas analizados para armar el mapa (hay ${input.filter((t) => t._emb).length}).`)
  const byId = new Map(g.tracks.map((t) => [t.id!, t]))
  return {
    ...lib,
    audioAnalysis: true,
    clusters: g.clusters,
    galaxy: g.report,
    tracks: lib.tracks.map((t) => {
      const a = byId.get(t.id)
      return a ? { ...t, ...a } : { ...t, x: undefined, y: undefined, cluster: null }
    }),
  }
}
