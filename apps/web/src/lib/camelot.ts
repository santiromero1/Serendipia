// Rueda de Camelot — 24 posiciones. Usada por el selector de claves y el
// score de compatibilidad (graduado 1.0 / 0.8 / 0, igual que 4-technical.md §6.3).

export const CAMELOT_KEYS: string[] = [
  ...Array.from({ length: 12 }, (_, i) => `${i + 1}A`),
  ...Array.from({ length: 12 }, (_, i) => `${i + 1}B`),
]

/** Clave Camelot → nombre musical estándar (para tooltips/labels). */
export const CAMELOT_TO_STANDARD: Record<string, string> = {
  '1A': 'Abm', '2A': 'Ebm', '3A': 'Bbm', '4A': 'Fm', '5A': 'Cm', '6A': 'Gm',
  '7A': 'Dm', '8A': 'Am', '9A': 'Em', '10A': 'Bm', '11A': 'F#m', '12A': 'Dbm',
  '1B': 'B', '2B': 'F#', '3B': 'Db', '4B': 'Ab', '5B': 'Eb', '6B': 'Bb',
  '7B': 'F', '8B': 'C', '9B': 'G', '10B': 'D', '11B': 'A', '12B': 'E',
}

// Tono (hue) por número de la rueda 1..12 — aprox. rueda Mixed In Key.
const CAMELOT_HUE: Record<number, number> = {
  1: 158, 2: 130, 3: 95, 4: 60, 5: 35, 6: 8,
  7: 340, 8: 310, 9: 280, 10: 250, 11: 215, 12: 185,
}

/** Color de una clave Camelot ("8A", "11B"…) para la rueda y el grafo. */
export function camelotColor(key: string | null): string {
  if (!key) return '#6b7280'
  const n = parseInt(key, 10)
  const letter = key.slice(String(n).length) // 'A' | 'B'
  const h = CAMELOT_HUE[n] ?? 220
  const l = letter === 'B' ? 62 : 70
  const s = letter === 'B' ? 55 : 62
  return `hsl(${h}, ${s}%, ${l}%)`
}

/**
 * Compatibilidad de clave graduada.
 * Misma o adyacente ±1 → 1.0 · relativa mayor/menor (mismo nº, distinto modo) → 0.8 · resto → 0
 */
export function camelotCompatibilityScore(a: string | null, b: string | null): number {
  if (!a || !b) return 0
  const numA = parseInt(a, 10)
  const numB = parseInt(b, 10)
  const letterA = a.slice(-1)
  const letterB = b.slice(-1)
  const adjacent = (x: number, y: number) =>
    x === y || (x % 12) + 1 === y || (y % 12) + 1 === x // wrap 12↔1

  if (letterA === letterB) return adjacent(numA, numB) ? 1.0 : 0
  return numA === numB ? 0.8 : 0
}
