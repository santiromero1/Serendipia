import { create } from 'zustand'
import type { Track } from '@/lib/types'

export type Range = [number, number]

export const BPM_LIMITS: Range = [90, 150]
export const SCALE_LIMITS: Range = [1, 10]

interface Values {
  search: string
  bpm: Range
  energy: Range
  dance: Range
  bright: Range
  keys: string[]
  genres: string[]
  crates: string[]
  tags: string[]
}

const initial: Values = {
  search: '',
  bpm: BPM_LIMITS,
  energy: SCALE_LIMITS,
  dance: SCALE_LIMITS,
  bright: SCALE_LIMITS,
  keys: [],
  genres: [],
  crates: [],
  tags: [],
}

type ListField = 'keys' | 'genres' | 'crates' | 'tags'
type RangeField = 'bpm' | 'energy' | 'dance' | 'bright'

interface FilterState extends Values {
  setSearch: (v: string) => void
  setRange: (field: RangeField, v: Range) => void
  toggle: (field: ListField, v: string) => void
  reset: () => void
}

export const useFilters = create<FilterState>((set) => ({
  ...initial,
  setSearch: (search) => set({ search }),
  setRange: (field, v) => set({ [field]: v } as Partial<Values>),
  toggle: (field, v) =>
    set((s) => ({ [field]: s[field].includes(v) ? s[field].filter((x) => x !== v) : [...s[field], v] }) as Partial<Values>),
  reset: () => set(initial),
}))

const full = (r: Range, lim: Range) => r[0] <= lim[0] && r[1] >= lim[1]

export function activeFilterCount(f: Values): number {
  return (
    (f.search ? 1 : 0) +
    (full(f.bpm, BPM_LIMITS) ? 0 : 1) +
    (['energy', 'dance', 'bright'] as const).filter((k) => !full(f[k], SCALE_LIMITS)).length +
    (f.keys.length ? 1 : 0) +
    (f.genres.length ? 1 : 0) +
    (f.crates.length ? 1 : 0) +
    (f.tags.length ? 1 : 0)
  )
}

/** Un rango acotado excluye los temas sin ese dato; un rango completo no filtra. */
const inRange = (v: number | null, r: Range, lim: Range) => full(r, lim) || (v != null && v >= r[0] && v <= r[1])

export function matchesFilters(t: Track, f: Values): boolean {
  if (!inRange(t.bpm, f.bpm, BPM_LIMITS)) return false
  if (!inRange(t.energy, f.energy, SCALE_LIMITS)) return false
  if (!inRange(t.dance, f.dance, SCALE_LIMITS)) return false
  if (!inRange(t.bright, f.bright, SCALE_LIMITS)) return false
  if (f.keys.length && !(t.key && f.keys.includes(t.key))) return false
  if (f.genres.length && !f.genres.includes(t.genre)) return false
  if (f.crates.length && !f.crates.includes(`${t.genre}/${t.crate ?? ''}`)) return false
  if (f.tags.length && !f.tags.some((g) => t.tags.includes(g))) return false
  if (f.search) {
    const hay = `${t.artist} ${t.title} ${t.label ?? ''} ${t.crate ?? ''} ${t.genre}`.toLowerCase()
    if (!f.search.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false
  }
  return true
}
