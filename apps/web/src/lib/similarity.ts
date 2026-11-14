import type { Track } from './types'
import { keyRule, type KeyRule } from './harmony'

const gap = (a: number | null, b: number | null, span: number) =>
  a == null || b == null ? 0.5 : Math.min(1, Math.abs(a - b) / span)

/**
 * Distancia entre dos temas, 0 (iguales) a ~1.5.
 * Sonido (energía, bailabilidad, brillo, BPM) más una penalidad por género y cajón distintos.
 */
export function distance(a: Track, b: Track): number {
  const sound = Math.sqrt(
    (gap(a.energy, b.energy, 9) ** 2 * 1.2 +
      gap(a.dance, b.dance, 9) ** 2 +
      gap(a.bright, b.bright, 9) ** 2 +
      gap(a.bpm, b.bpm, 12) ** 2 * 0.8) /
      4,
  )
  const place = a.genre !== b.genre ? 0.45 : a.crate !== b.crate ? 0.14 : 0
  return sound + place
}

export interface Suggestion {
  track: Track
  score: number
  rule?: KeyRule | null
  bpmDiff?: number | null
}

/** Parecidos al conjunto, sin importar el orden. */
export function matching(seed: Track[], pool: Track[], limit = 24): Suggestion[] {
  if (!seed.length) return []
  return pool
    .map((t) => ({ track: t, score: 1 - seed.reduce((s, m) => s + distance(t, m), 0) / seed.length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Vecinos más cercanos de un tema. */
export function neighbors(of: Track, pool: Track[], limit = 8): Suggestion[] {
  return matching([of], pool.filter((t) => t.id !== of.id), limit)
}

/**
 * Qué puede seguir a un tema: tonalidad compatible según las reglas del usuario,
 * BPM cercano, y sonido parecido con leve preferencia por subir la energía.
 */
export function nextTracks(last: Track, pool: Track[], limit = 24): Suggestion[] {
  const out: Suggestion[] = []
  for (const t of pool) {
    if (t.id === last.id) continue
    const bpmDiff = last.bpm != null && t.bpm != null ? t.bpm - last.bpm : null
    if (bpmDiff != null && Math.abs(bpmDiff) > 6) continue
    const rule = keyRule(last.key, t.key)
    const bothKeys = last.key != null && t.key != null
    if (bothKeys && !rule) continue
    const keyScore = rule ? rule.score : 0.35
    const bpmScore = bpmDiff == null ? 0.5 : 1 - Math.abs(bpmDiff) / 6
    const lift = last.energy != null && t.energy != null ? t.energy - last.energy : 0
    const liftScore = lift >= -0.5 && lift <= 2 ? 1 : Math.max(0, 1 - Math.abs(lift - 0.75) / 5)
    const score = keyScore * 0.4 + bpmScore * 0.2 + (1 - Math.min(1, distance(last, t))) * 0.3 + liftScore * 0.1
    out.push({ track: t, score, rule, bpmDiff })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Ordena de menos a más energía encadenando tonalidades compatibles.
 * Arranca por el de menor energía y elige cada vez el que mejor sigue.
 */
export function magicSort(tracks: Track[]): Track[] {
  if (tracks.length < 3) return tracks
  const rest = [...tracks].sort((a, b) => (a.energy ?? 5) - (b.energy ?? 5))
  const out = [rest.shift()!]
  while (rest.length) {
    const last = out[out.length - 1]
    let best = 0
    let bestScore = -Infinity
    rest.forEach((t, i) => {
      const rule = keyRule(last.key, t.key)
      const keyScore = rule ? rule.score : last.key && t.key ? 0 : 0.3
      const step = (t.energy ?? 5) - (last.energy ?? 5)
      // i es la posición en el orden por energía: cuanto antes, menos salto
      const score = keyScore * 1.2 - Math.abs(step) * 0.12 - i * 0.04 - gap(last.bpm, t.bpm, 8) * 0.4
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    })
    out.push(rest.splice(best, 1)[0])
  }
  return out
}
