import { UMAP } from 'umap-js'
import type { Track } from './types'

function z(values: (number | null)[]): number[] {
  const ok = values.filter((v): v is number => v != null)
  const mean = ok.reduce((a, b) => a + b, 0) / (ok.length || 1)
  const sd = Math.sqrt(ok.reduce((a, b) => a + (b - mean) ** 2, 0) / (ok.length || 1)) || 1
  return values.map((v) => (v == null ? 0 : (v - mean) / sd))
}

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Posición de cada tema en el mapa de cercanía, para bibliotecas que llegaron sin ella
 * (por ejemplo, solo con el XML). Mismo criterio que el escáner: sonido + género + cajón.
 */
export function computeLayout(tracks: Track[]): Track[] {
  if (tracks.length < 20) return tracks
  const genres = [...new Set(tracks.map((t) => t.genre))]
  const crates = [...new Set(tracks.map((t) => `${t.genre}/${t.crate ?? ''}`))]
  const zE = z(tracks.map((t) => t.energy))
  const zD = z(tracks.map((t) => t.dance))
  const zB = z(tracks.map((t) => t.bright))
  const zBpm = z(tracks.map((t) => t.bpm))
  const vectors = tracks.map((t, i) => {
    const v = [zE[i], zD[i], zB[i], zBpm[i] * 0.8]
    for (const g of genres) v.push(t.genre === g ? 1.15 : 0)
    for (const c of crates) v.push(`${t.genre}/${t.crate ?? ''}` === c ? 0.75 : 0)
    return v
  })
  const emb = new UMAP({ nComponents: 2, nNeighbors: Math.min(18, tracks.length - 1), minDist: 0.5, spread: 1.4, random: rng(7) }).fit(vectors)
  const xs = emb.map((e) => e[0])
  const ys = emb.map((e) => e[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  return tracks.map((t, i) => ({
    ...t,
    x: (emb[i][0] - x0) / (x1 - x0 || 1),
    y: (emb[i][1] - y0) / (y1 - y0 || 1),
  }))
}
