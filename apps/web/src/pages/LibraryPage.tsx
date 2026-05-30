import { useMemo } from 'react'
import type { TrackFilters } from '@serendipia/types'
import { LibraryToolbar } from '@/components/library/LibraryToolbar'
import { LibraryGrid } from '@/components/library/LibraryGrid'
import { LibraryList } from '@/components/library/LibraryList'
import { EmptyState } from '@/components/library/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useTracks, useLibraryStats } from '@/hooks/useTracks'
import { useFilterStore, BPM_RANGE } from '@/stores/filters'
import { useUIStore } from '@/stores/ui'

export function LibraryPage() {
  // Suscripción a primitivos (refs estables) — evita el bucle infinito
  // de useSyncExternalStore cuando el selector devuelve un objeto nuevo en cada call.
  const search = useFilterStore((s) => s.search)
  const bpmMin = useFilterStore((s) => s.bpmMin)
  const bpmMax = useFilterStore((s) => s.bpmMax)
  const keys = useFilterStore((s) => s.keys)
  const energyMin = useFilterStore((s) => s.energyMin)
  const energyMax = useFilterStore((s) => s.energyMax)
  const genres = useFilterStore((s) => s.genres)
  const tags = useFilterStore((s) => s.tags)
  const sortBy = useFilterStore((s) => s.sortBy)
  const sortOrder = useFilterStore((s) => s.sortOrder)
  const view = useUIStore((s) => s.libraryView)

  const filters = useMemo<TrackFilters>(() => {
    const f: TrackFilters = { sort_by: sortBy, sort_order: sortOrder }
    if (search.trim()) f.search = search.trim()
    if (bpmMin > BPM_RANGE.min) f.bpm_min = bpmMin
    if (bpmMax < BPM_RANGE.max) f.bpm_max = bpmMax
    if (energyMin > 0) f.energy_min = energyMin
    if (energyMax < 1) f.energy_max = energyMax
    if (keys.length) f.key_camelot = keys
    if (genres.length) f.genre = genres
    if (tags.length) f.tags = tags
    return f
  }, [search, bpmMin, bpmMax, keys, energyMin, energyMax, genres, tags, sortBy, sortOrder])

  const { data, isLoading } = useTracks(filters)
  const { data: stats } = useLibraryStats()

  const tracks = data?.data ?? []
  const totalShown = data?.meta.total ?? 0
  const libraryEmpty = (stats?.total ?? 0) === 0

  if (libraryEmpty) return <EmptyState />

  return (
    <div className="space-y-5">
      <LibraryToolbar total={totalShown} />
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
      ) : tracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
          <p className="text-sm text-fg-soft">Ningún track coincide con los filtros.</p>
          <p className="mt-1 text-[13px] text-fg-faint">Probá ampliar el rango de BPM o quitar etiquetas.</p>
        </div>
      ) : view === 'grid' ? (
        <LibraryGrid tracks={tracks} />
      ) : (
        <LibraryList tracks={tracks} />
      )}
    </div>
  )
}
