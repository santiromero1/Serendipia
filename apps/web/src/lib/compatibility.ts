import type { Track } from '@serendipia/types'
import { camelotCompatibilityScore } from '@/lib/camelot'

export interface Connection {
  aId: string
  bId: string
  score: number
  bpmDiff: number
  keyScore: number
  energyDiff: number
}

/**
 * Score de compatibilidad entre dos tracks (0 a 1).
 * Pesos: BPM 40% · clave Camelot graduada 40% · energía 20%.
 * Fiel a CKM/4-technical.md §6.3 y CKM/2-prd.md F-07.
 */
export function compatibilityScore(a: Track, b: Track): number {
  if (a.bpm == null || b.bpm == null || a.energy == null || b.energy == null) return 0
  const bpmDiff = Math.abs(a.bpm - b.bpm)
  const bpmScore = bpmDiff <= 8 ? 1 - bpmDiff / 8 : 0
  const keyScore = camelotCompatibilityScore(a.key_camelot, b.key_camelot)
  const energyScore = 1 - Math.abs(a.energy - b.energy)
  return bpmScore * 0.4 + keyScore * 0.4 + energyScore * 0.2
}

/**
 * Calcula todas las conexiones de la biblioteca con score > threshold.
 * Orden canónico aId < bId para evitar duplicados (CKM/2-prd.md §5).
 * O(n²); para >1000 tracks habría que indexar por BPM/clave antes.
 */
export function computeConnections(tracks: Track[], threshold = 0.65): Connection[] {
  const out: Connection[] = []
  for (let i = 0; i < tracks.length; i++) {
    const a = tracks[i]
    if (a.bpm == null || a.energy == null) continue
    for (let j = i + 1; j < tracks.length; j++) {
      const b = tracks[j]
      if (b.bpm == null || b.energy == null) continue
      const score = compatibilityScore(a, b)
      if (score <= threshold) continue
      const [aId, bId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id]
      out.push({
        aId, bId, score,
        bpmDiff: Math.abs(a.bpm - b.bpm),
        keyScore: camelotCompatibilityScore(a.key_camelot, b.key_camelot),
        energyDiff: Math.abs(a.energy - b.energy),
      })
    }
  }
  return out
}
