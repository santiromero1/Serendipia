/**
 * Reglas Camelot del usuario, de más segura a más abierta:
 * 1 misma · 2 ±1 misma letra · 3 mismo número otra letra · 4 ±2 · 5 ±5 · 6 ±3 con cambio de letra.
 */
export interface KeyRule {
  rank: number
  label: string
  score: number
}

const RULES: Record<number, KeyRule> = {
  1: { rank: 1, label: 'misma', score: 1 },
  2: { rank: 2, label: '±1', score: 0.92 },
  3: { rank: 3, label: 'A↔B', score: 0.86 },
  4: { rank: 4, label: '±2', score: 0.62 },
  5: { rank: 5, label: '±5', score: 0.52 },
  6: { rank: 6, label: '±3 A↔B', score: 0.5 },
}

export function parseKey(key: string | null): { n: number; letter: 'A' | 'B' } | null {
  const m = key?.match(/^(\d{1,2})([AB])$/)
  return m ? { n: Number(m[1]), letter: m[2] as 'A' | 'B' } : null
}

export function keyRule(from: string | null, to: string | null): KeyRule | null {
  const a = parseKey(from)
  const b = parseKey(to)
  if (!a || !b) return null
  const d = Math.min((a.n - b.n + 12) % 12, (b.n - a.n + 12) % 12)
  const same = a.letter === b.letter
  if (same && d === 0) return RULES[1]
  if (same && d === 1) return RULES[2]
  if (!same && d === 0) return RULES[3]
  if (same && d === 2) return RULES[4]
  if (same && d === 5) return RULES[5]
  if (!same && d === 3) return RULES[6]
  return null
}

/** Color de dato para la tonalidad: tono según la rueda, croma bajo. */
export function keyColor(key: string | null): string {
  const k = parseKey(key)
  if (!k) return 'oklch(0.42 0.007 260)'
  const hue = ((k.n - 1) * 30 + 200) % 360
  return `oklch(${k.letter === 'B' ? 0.8 : 0.7} 0.085 ${hue})`
}

export const ALL_KEYS = Array.from({ length: 12 }, (_, i) => i + 1).flatMap((n) => [`${n}A`, `${n}B`])
