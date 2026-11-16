import type { Track } from './types'
import { distance } from './similarity'

/**
 * Consejos de categorización: temas cuyos vecinos más parecidos (por sonido y tags)
 * viven casi todos en otra carpeta o en otro cajón.
 *
 * Son para revisar a oído, no veredictos: los cajones son criterio del DJ y el sonido
 * solo los adivina en parte. Por eso se pide una mayoría clara y se corrige por tamaño:
 * que 9 de 12 vecinos estén en una carpeta que tiene la mitad de la biblioteca no dice nada.
 */
export interface Advice {
  track: Track
  kind: 'genre' | 'crate'
  /** carpeta sugerida */
  genre: string
  /** cajón sugerido (solo si kind es 'crate') */
  crate: string | null
  /** vecinos que están en el destino, sobre cuántos se miraron */
  hits: number
  of: number
  /** vecinos que están donde está hoy el tema */
  own: number
  /** cuántas veces más de lo esperable por el tamaño del destino */
  lift: number
  neighbors: Track[]
}

const K = 12

export function buildAdvice(tracks: Track[]): Advice[] {
  const pool = tracks.filter((t) => t.emb)
  if (pool.length < 40) return []

  const genreShare = new Map<string, number>()
  const crateShare = new Map<string, number>()
  const genreWithCrate = new Map<string, number>()
  for (const t of pool) {
    genreShare.set(t.genre, (genreShare.get(t.genre) ?? 0) + 1 / pool.length)
    if (t.crate) {
      genreWithCrate.set(t.genre, (genreWithCrate.get(t.genre) ?? 0) + 1)
      crateShare.set(`${t.genre}/${t.crate}`, (crateShare.get(`${t.genre}/${t.crate}`) ?? 0) + 1)
    }
  }

  const out: Advice[] = []
  for (const t of pool) {
    // las carpetas de un set son copias armadas a mano, no categorías
    if (t.crate?.startsWith('SET')) continue
    const near = pool
      .filter((o) => o.id !== t.id && !o.crate?.startsWith('SET'))
      .map((o) => [o, distance(t, o)] as const)
      .sort((a, b) => a[1] - b[1])
      .slice(0, K)
      .map(([o]) => o)

    const byGenre = new Map<string, Track[]>()
    for (const o of near) byGenre.set(o.genre, [...(byGenre.get(o.genre) ?? []), o])
    const [topGenre, inTop] = [...byGenre].sort((a, b) => b[1].length - a[1].length)[0]
    const ownGenre = byGenre.get(t.genre)?.length ?? 0
    const lift = inTop.length / K / (genreShare.get(topGenre) ?? 1)
    if (topGenre !== t.genre && inTop.length >= 7 && ownGenre <= 2 && lift >= 1.8) {
      out.push({ track: t, kind: 'genre', genre: topGenre, crate: null, hits: inTop.length, of: K, own: ownGenre, lift, neighbors: inTop })
      continue
    }

    if (!t.crate) continue
    const same = near.filter((o) => o.genre === t.genre && o.crate)
    if (same.length < 8) continue
    const byCrate = new Map<string, Track[]>()
    for (const o of same) byCrate.set(o.crate!, [...(byCrate.get(o.crate!) ?? []), o])
    const [topCrate, inCrate] = [...byCrate].sort((a, b) => b[1].length - a[1].length)[0]
    const ownCrate = byCrate.get(t.crate)?.length ?? 0
    const expected = (crateShare.get(`${t.genre}/${topCrate}`) ?? 1) / (genreWithCrate.get(t.genre) ?? 1)
    const crateLift = inCrate.length / same.length / expected
    if (topCrate !== t.crate && inCrate.length >= same.length * 0.6 && ownCrate <= 1 && crateLift >= 1.5) {
      out.push({ track: t, kind: 'crate', genre: t.genre, crate: topCrate, hits: inCrate.length, of: same.length, own: ownCrate, lift: crateLift, neighbors: inCrate })
    }
  }
  return out.sort((a, b) => (b.hits / b.of) * b.lift - (a.hits / a.of) * a.lift)
}
