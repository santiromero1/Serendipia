import { useMemo, useState } from 'react'
import type { Track, TrackFilters } from '@serendipia/types'
import { Graph } from '@/components/graph/Graph'
import { computeConnections } from '@/lib/compatibility'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Kbd } from '@/components/ui/Kbd'
import { energyColor } from '@/lib/format'
import { useTracks } from '@/hooks/useTracks'
import { useFilterStore, BPM_RANGE } from '@/stores/filters'
import { useUIStore } from '@/stores/ui'
import { Network } from 'lucide-react'

export function GraphPage() {
  // Mismos filtros que la Biblioteca — el grafo se recalcula al filtrar.
  const search = useFilterStore((s) => s.search)
  const bpmMin = useFilterStore((s) => s.bpmMin)
  const bpmMax = useFilterStore((s) => s.bpmMax)
  const keys = useFilterStore((s) => s.keys)
  const energyMin = useFilterStore((s) => s.energyMin)
  const energyMax = useFilterStore((s) => s.energyMax)
  const genres = useFilterStore((s) => s.genres)
  const tags = useFilterStore((s) => s.tags)

  const filters = useMemo<TrackFilters>(() => {
    const f: TrackFilters = { limit: 500 }
    if (search.trim()) f.search = search.trim()
    if (bpmMin > BPM_RANGE.min) f.bpm_min = bpmMin
    if (bpmMax < BPM_RANGE.max) f.bpm_max = bpmMax
    if (energyMin > 0) f.energy_min = energyMin
    if (energyMax < 1) f.energy_max = energyMax
    if (keys.length) f.key_camelot = keys
    if (genres.length) f.genre = genres
    if (tags.length) f.tags = tags
    return f
  }, [search, bpmMin, bpmMax, keys, energyMin, energyMax, genres, tags])

  const { data, isLoading } = useTracks(filters)
  const tracks = data?.data ?? []
  const openDetail = useUIStore((s) => s.openTrackDetail)

  const connections = useMemo(() => computeConnections(tracks, 0.65), [tracks])
  const [hovered, setHovered] = useState<Track | null>(null)

  return (
    <div className="relative h-[calc(100vh-104px)] overflow-hidden rounded-xl border border-border bg-surface/30">
      {isLoading ? (
        <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>
      ) : tracks.length === 0 ? (
        <EmptyGraph />
      ) : (
        <Graph
          tracks={tracks}
          threshold={0.65}
          onSelect={openDetail}
          onHoverChange={setHovered}
        />
      )}

      {/* Stats top-left */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3 rounded-xl border border-border bg-background/85 backdrop-blur-md px-3.5 py-2 text-[12px] text-fg-soft animate-fade-in">
        <Network size={14} className="text-primary-light" />
        <span><span className="font-mono text-fg tabular-nums">{tracks.length}</span> nodos</span>
        <span className="text-fg-faint">·</span>
        <span><span className="font-mono text-fg tabular-nums">{connections.length}</span> conexiones</span>
      </div>

      {/* Hover card top-right */}
      {hovered && <HoverCard track={hovered} connectionCount={countNeighbors(hovered.id, connections)} />}

      {/* Legend bottom-left */}
      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-xl border border-border bg-background/85 backdrop-blur-md px-3.5 py-2 text-[11px] text-fg-soft animate-fade-in">
        <span className="text-fg-faint">Energía</span>
        <LegendDot color={energyColor(0.2)} label="Baja" />
        <LegendDot color={energyColor(0.5)} label="Media" />
        <LegendDot color={energyColor(0.75)} label="Alta" />
        <LegendDot color={energyColor(0.95)} label="Peak" />
      </div>

      {/* Controls hint bottom-right */}
      <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-3 rounded-xl border border-border bg-background/85 backdrop-blur-md px-3.5 py-2 text-[11px] text-fg-soft animate-fade-in">
        <span className="flex items-center gap-1.5"><Kbd>scroll</Kbd> zoom</span>
        <span className="flex items-center gap-1.5"><Kbd>drag</Kbd> pan</span>
        <span className="flex items-center gap-1.5"><Kbd>click</Kbd> detalle</span>
      </div>
    </div>
  )
}

function HoverCard({ track, connectionCount }: { track: Track; connectionCount: number }) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 w-72 rounded-xl border border-border bg-background/95 backdrop-blur-md p-3.5 shadow-card animate-fade-in">
      <div className="flex items-start gap-2">
        <span
          className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: energyColor(track.energy), boxShadow: `0 0 8px ${energyColor(track.energy)}88` }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-fg">{track.title}</div>
          <div className="truncate text-[11px] text-fg-soft">{track.artist}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[12px]">
        <Stat label="BPM" value={track.bpm ?? '—'} />
        <Stat label="Clave" value={track.key_camelot ?? '—'} />
        <Stat label="Energía" value={track.energy?.toFixed(2) ?? '—'} />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-fg-faint">
        <span>{track.genre[0] ?? '—'}</span>
        <Badge tone="primary">{connectionCount} compatibles →</Badge>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-0.5">
      <div className="font-sans text-[10px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className="text-fg tabular-nums">{value}</div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function countNeighbors(id: string, connections: ReturnType<typeof computeConnections>) {
  let n = 0
  for (const c of connections) if (c.aId === id || c.bId === id) n++
  return n
}

function EmptyGraph() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-fg-faint">
        <Network size={28} />
      </div>
      <p className="text-sm text-fg-soft">El grafo se arma cuando hay tracks que cumplan los filtros.</p>
      <p className="text-[12px] text-fg-faint">Probá ampliar el rango de BPM o limpiar los filtros.</p>
    </div>
  )
}
