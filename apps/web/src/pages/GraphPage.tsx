import { useMemo, useState } from 'react'
import type { Track, TrackFilters } from '@serendipia/types'
import { Graph, type ColorBy } from '@/components/graph/Graph'
import { StorylineView } from '@/components/graph/StorylineView'
import { computeConnections } from '@/lib/compatibility'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Kbd } from '@/components/ui/Kbd'
import { Dropdown, MenuItem } from '@/components/ui/Dropdown'
import { energyColor, cx } from '@/lib/format'
import { camelotColor } from '@/lib/camelot'
import { visibleClusters } from '@/lib/genres'
import { useTracks } from '@/hooks/useTracks'
import { usePlaylists, usePlaylist } from '@/hooks/usePlaylists'
import { useFilterStore, BPM_RANGE } from '@/stores/filters'
import { useUIStore } from '@/stores/ui'
import { Network, ChevronDown, Check, Workflow, Spline } from 'lucide-react'

type Mode = 'collection' | 'storyline'
type Scope = 'all' | string // 'all' | playlistId

export function GraphPage() {
  const search = useFilterStore((s) => s.search)
  const bpmMin = useFilterStore((s) => s.bpmMin)
  const bpmMax = useFilterStore((s) => s.bpmMax)
  const keys = useFilterStore((s) => s.keys)
  const energyMin = useFilterStore((s) => s.energyMin)
  const energyMax = useFilterStore((s) => s.energyMax)
  const danceMin = useFilterStore((s) => s.danceMin)
  const danceMax = useFilterStore((s) => s.danceMax)
  const valenceMin = useFilterStore((s) => s.valenceMin)
  const valenceMax = useFilterStore((s) => s.valenceMax)
  const genres = useFilterStore((s) => s.genres)
  const tags = useFilterStore((s) => s.tags)

  const [mode, setMode] = useState<Mode>('collection')
  const [scope, setScope] = useState<Scope>('all')
  const [colorBy, setColorBy] = useState<ColorBy>('energy')
  const [hovered, setHovered] = useState<Track | null>(null)

  const openDetail = useUIStore((s) => s.openTrackDetail)
  const { data: playlists } = usePlaylists()
  const { data: scopedPlaylist } = usePlaylist(scope === 'all' ? undefined : scope)

  const filters = useMemo<TrackFilters>(() => {
    const f: TrackFilters = { limit: 500 }
    if (search.trim()) f.search = search.trim()
    if (bpmMin > BPM_RANGE.min) f.bpm_min = bpmMin
    if (bpmMax < BPM_RANGE.max) f.bpm_max = bpmMax
    if (energyMin > 0) f.energy_min = energyMin
    if (energyMax < 1) f.energy_max = energyMax
    if (danceMin > 0) f.danceability_min = danceMin
    if (danceMax < 1) f.danceability_max = danceMax
    if (valenceMin > 0) f.valence_min = valenceMin
    if (valenceMax < 1) f.valence_max = valenceMax
    if (keys.length) f.key_camelot = keys
    if (genres.length) f.genre = genres
    if (tags.length) f.tags = tags
    return f
  }, [search, bpmMin, bpmMax, keys, energyMin, energyMax, danceMin, danceMax, valenceMin, valenceMax, genres, tags])

  const { data, isLoading } = useTracks(filters)
  const allTracks = data?.data ?? []

  // Scope: si es una playlist, restringimos a sus miembros (filtro del grafo).
  const tracks = useMemo(() => {
    if (scope === 'all' || !scopedPlaylist) return allTracks
    const ids = new Set(scopedPlaylist.tracks.map((t) => t.id))
    return allTracks.filter((t) => ids.has(t.id))
  }, [allTracks, scope, scopedPlaylist])

  const connections = useMemo(() => computeConnections(tracks, 0.65), [tracks])
  const scopeLabel = scope === 'all' ? 'Toda la colección' : scopedPlaylist?.name ?? 'Playlist'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      {/* Barra de control */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Scope */}
        <Dropdown
          align="left"
          ariaLabel="Alcance del grafo"
          trigger={() => (
            <span className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium text-fg hover:border-border-strong transition-colors">
              {scopeLabel}
              <ChevronDown size={14} className="text-fg-faint" />
            </span>
          )}
        >
          {(close) => (
            <>
              <MenuItem onClick={() => { setScope('all'); close() }}>
                <Check size={13} className={cx(scope === 'all' ? 'text-primary-light' : 'opacity-0')} /> Toda la colección
              </MenuItem>
              {(playlists ?? []).map((p) => (
                <MenuItem key={p.id} onClick={() => { setScope(p.id); close() }}>
                  <Check size={13} className={cx(scope === p.id ? 'text-primary-light' : 'opacity-0')} /> {p.name}
                </MenuItem>
              ))}
            </>
          )}
        </Dropdown>

        {/* Modo */}
        <Seg>
          <SegBtn active={mode === 'collection'} onClick={() => setMode('collection')}>
            <Network size={14} /> Colección
          </SegBtn>
          <SegBtn active={mode === 'storyline'} onClick={() => setMode('storyline')}>
            <Spline size={14} /> Storyline
          </SegBtn>
        </Seg>

        {mode === 'collection' && (
          <>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-fg-faint">Color:</span>
              <Seg>
                <SegBtn active={colorBy === 'energy'} onClick={() => setColorBy('energy')}>Energía</SegBtn>
                <SegBtn active={colorBy === 'genre'} onClick={() => setColorBy('genre')}>Género</SegBtn>
                <SegBtn active={colorBy === 'key'} onClick={() => setColorBy('key')}>Clave</SegBtn>
              </Seg>
            </div>
          </>
        )}
        {mode === 'storyline' && (
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-fg-faint">
            <Workflow size={13} /> Armá el orden del set arrastrando cards
          </span>
        )}
      </div>

      {/* Lienzo */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface/30">
        {isLoading ? (
          <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>
        ) : mode === 'storyline' ? (
          <StorylineView tracks={tracks} title={scopeLabel} onSelect={(id) => id && openDetail(id)} />
        ) : tracks.length === 0 ? (
          <EmptyGraph />
        ) : (
          <>
            <Graph tracks={tracks} threshold={0.65} colorBy={colorBy} onSelect={openDetail} onHoverChange={setHovered} />

            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3 rounded-xl border border-border bg-background/85 px-3.5 py-2 text-[12px] text-fg-soft backdrop-blur-md animate-fade-in">
              <Network size={14} className="text-primary-light" />
              <span><span className="font-mono text-fg tabular-nums">{tracks.length}</span> nodos</span>
              <span className="text-fg-faint">·</span>
              <span><span className="font-mono text-fg tabular-nums">{connections.length}</span> conexiones</span>
            </div>

            {hovered && <HoverCard track={hovered} connectionCount={countNeighbors(hovered.id, connections)} />}

            <Legend colorBy={colorBy} />

            <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-3 rounded-xl border border-border bg-background/85 px-3.5 py-2 text-[11px] text-fg-soft backdrop-blur-md animate-fade-in">
              <span className="flex items-center gap-1.5"><Kbd>scroll</Kbd> zoom</span>
              <span className="flex items-center gap-1.5"><Kbd>drag</Kbd> pan</span>
              <span className="flex items-center gap-1.5"><Kbd>click</Kbd> detalle</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Legend({ colorBy }: { colorBy: ColorBy }) {
  let items: { color: string; label: string }[]
  let title: string
  if (colorBy === 'energy') {
    title = 'Energía'
    items = [
      { color: energyColor(0.2), label: 'Baja' },
      { color: energyColor(0.5), label: 'Media' },
      { color: energyColor(0.75), label: 'Alta' },
      { color: energyColor(0.95), label: 'Peak' },
    ]
  } else if (colorBy === 'genre') {
    title = 'Género'
    items = visibleClusters().map((c) => ({ color: c.color, label: c.label }))
  } else {
    title = 'Clave (Camelot)'
    items = [
      { color: camelotColor('8A'), label: 'Am' },
      { color: camelotColor('11B'), label: 'A' },
      { color: camelotColor('5A'), label: 'Cm' },
      { color: camelotColor('2B'), label: 'F#' },
    ]
  }
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 flex max-w-[60%] flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-background/85 px-3.5 py-2 text-[11px] text-fg-soft backdrop-blur-md animate-fade-in">
      <span className="text-fg-faint">{title}</span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

function HoverCard({ track, connectionCount }: { track: Track; connectionCount: number }) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 w-72 rounded-xl border border-border bg-background/95 p-3.5 shadow-card backdrop-blur-md animate-fade-in">
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

function Seg({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">{children}</div>
}

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors cursor-pointer',
        active ? 'bg-primary text-white' : 'text-fg-soft hover:bg-surface-raised hover:text-fg',
      )}
    >
      {children}
    </button>
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
