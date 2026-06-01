import { create } from 'zustand'
import type { TrackFilters } from '@serendipia/types'

type SortBy = NonNullable<TrackFilters['sort_by']>
type SortOrder = NonNullable<TrackFilters['sort_order']>

interface FilterState {
  search: string
  bpmMin: number
  bpmMax: number
  keys: string[]
  energyMin: number
  energyMax: number
  danceMin: number
  danceMax: number
  valenceMin: number
  valenceMax: number
  genres: string[]
  tags: string[]
  sortBy: SortBy
  sortOrder: SortOrder

  setSearch: (v: string) => void
  setBpm: (min: number, max: number) => void
  setEnergy: (min: number, max: number) => void
  setDance: (min: number, max: number) => void
  setValence: (min: number, max: number) => void
  toggleKey: (k: string) => void
  toggleGenre: (g: string) => void
  toggleTag: (t: string) => void
  setSort: (by: SortBy, order: SortOrder) => void
  reset: () => void
  toFilters: () => TrackFilters
  activeCount: () => number
}

export const BPM_RANGE = { min: 90, max: 180 }

const initial = {
  search: '',
  bpmMin: BPM_RANGE.min,
  bpmMax: BPM_RANGE.max,
  keys: [] as string[],
  energyMin: 0,
  energyMax: 1,
  danceMin: 0,
  danceMax: 1,
  valenceMin: 0,
  valenceMax: 1,
  genres: [] as string[],
  tags: [] as string[],
  sortBy: 'created_at' as SortBy,
  sortOrder: 'desc' as SortOrder,
}

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]

export const useFilterStore = create<FilterState>((set, get) => ({
  ...initial,

  setSearch: (v) => set({ search: v }),
  setBpm: (min, max) => set({ bpmMin: min, bpmMax: max }),
  setEnergy: (min, max) => set({ energyMin: min, energyMax: max }),
  setDance: (min, max) => set({ danceMin: min, danceMax: max }),
  setValence: (min, max) => set({ valenceMin: min, valenceMax: max }),
  toggleKey: (k) => set((s) => ({ keys: toggle(s.keys, k) })),
  toggleGenre: (g) => set((s) => ({ genres: toggle(s.genres, g) })),
  toggleTag: (t) => set((s) => ({ tags: toggle(s.tags, t) })),
  setSort: (by, order) => set({ sortBy: by, sortOrder: order }),
  reset: () => set({ ...initial }),

  toFilters: () => {
    const s = get()
    const f: TrackFilters = { sort_by: s.sortBy, sort_order: s.sortOrder }
    if (s.search.trim()) f.search = s.search.trim()
    if (s.bpmMin > BPM_RANGE.min) f.bpm_min = s.bpmMin
    if (s.bpmMax < BPM_RANGE.max) f.bpm_max = s.bpmMax
    if (s.energyMin > 0) f.energy_min = s.energyMin
    if (s.energyMax < 1) f.energy_max = s.energyMax
    if (s.danceMin > 0) f.danceability_min = s.danceMin
    if (s.danceMax < 1) f.danceability_max = s.danceMax
    if (s.valenceMin > 0) f.valence_min = s.valenceMin
    if (s.valenceMax < 1) f.valence_max = s.valenceMax
    if (s.keys.length) f.key_camelot = s.keys
    if (s.genres.length) f.genre = s.genres
    if (s.tags.length) f.tags = s.tags
    return f
  },

  activeCount: () => {
    const s = get()
    let n = 0
    if (s.search.trim()) n++
    if (s.bpmMin > BPM_RANGE.min || s.bpmMax < BPM_RANGE.max) n++
    if (s.energyMin > 0 || s.energyMax < 1) n++
    if (s.danceMin > 0 || s.danceMax < 1) n++
    if (s.valenceMin > 0 || s.valenceMax < 1) n++
    n += s.keys.length + s.genres.length + s.tags.length
    return n
  },
}))
