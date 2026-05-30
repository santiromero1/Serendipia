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
