import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, AlignVerticalSpaceAround, Plus, Save, Music2, Clock, Activity, Zap, Sparkles } from 'lucide-react'
import type { Track } from '@serendipia/types'
import { compatibilityScore } from '@/lib/compatibility'
import { camelotColor } from '@/lib/camelot'
import { energyColor } from '@/lib/format'
import { CoverArt } from '@/components/ui/CoverArt'
import { Button } from '@/components/ui/Button'
import { useCreatePlaylist, useAddTrackToPlaylist } from '@/hooks/usePlaylists'

interface Props {
  tracks: Track[]
  title: string
  onSelect?: (id: string) => void
  selectedId?: string | null
}

interface FlowNode {
  id: string
  x: number
  y: number
}

const CARD_W = 168
const CARD_H = 150
const GAP_X = 220

/** Constructor de storyline: arrastrá cards para armar el orden del set. */
export function StorylineView({ tracks, title, onSelect, selectedId }: Props) {
  const navigate = useNavigate()
  const createPlaylist = useCreatePlaylist()
  const addToPlaylist = useAddTrackToPlaylist()

  const byId = useMemo(() => {
    const m = new Map<string, Track>()
    for (const t of tracks) m.set(t.id, t)
    return m
  }, [tracks])

  const initial = useMemo<FlowNode[]>(
    () => tracks.slice(0, 4).map((t, i) => ({ id: t.id, x: 60 + i * GAP_X, y: 200 + (i % 2 ? 70 : 0) })),
    [tracks],
  )

  const [flow, setFlow] = useState<FlowNode[]>(initial)
  const [compact, setCompact] = useState(true)
  const [saving, setSaving] = useState(false)
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)

  // Si cambia el scope (tracks), reseteamos el flow.
  useEffect(() => { setFlow(initial) }, [initial])

  const inFlow = new Set(flow.map((f) => f.id))

  // Sugeridos: tracks fuera del flow, ordenados por compatibilidad con el cierre.
  const suggestions = useMemo(() => {
    const closing = flow.length ? byId.get(flow[flow.length - 1].id) : null
    const pool = tracks.filter((t) => !inFlow.has(t.id))
    if (!closing) return pool.slice(0, 8)
    return pool
      .map((t) => ({ t, score: compatibilityScore(closing, t) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, tracks, byId])

  const onDown = (e: React.MouseEvent, node: FlowNode) => {
    e.stopPropagation()
    const r = areaRef.current?.getBoundingClientRect()
    if (!r) return
    dragRef.current = { id: node.id, dx: e.clientX - r.left - node.x, dy: e.clientY - r.top - node.y, moved: false }
  }

  useEffect(() => {
    const mv = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      d.moved = true
      const r = areaRef.current?.getBoundingClientRect()
      if (!r) return
      setFlow((f) => f.map((n) => (n.id === d.id ? { ...n, x: e.clientX - r.left - d.dx, y: e.clientY - r.top - d.dy } : n)))
    }
    const up = () => { dragRef.current = null }
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
  }, [])

  const addTrack = (t: Track) => {
    setFlow((f) => {
      const last = f[f.length - 1]
      const x = last ? last.x + GAP_X : 60
      const y = last ? last.y : 200
      return [...f, { id: t.id, x, y }]
    })
  }
  const straighten = () => setFlow((f) => f.map((n, i) => ({ ...n, x: 60 + i * GAP_X, y: 220 })))
  const reset = () => setFlow(initial)

  const flowTracks = flow.map((f) => byId.get(f.id)).filter((t): t is Track => !!t)
  const bpms = flowTracks.map((t) => t.bpm).filter((x): x is number => x != null)
  const ens = flowTracks.map((t) => t.energy).filter((x): x is number => x != null)
  const totalMs = flowTracks.reduce((a, t) => a + (t.duration_ms ?? 0), 0)
  const artists = new Set(flowTracks.map((t) => t.artist.split(',')[0].trim())).size
  const range = (arr: number[], fmt: (n: number) => string = String) =>
    arr.length ? `${fmt(Math.min(...arr))} – ${fmt(Math.max(...arr))}` : '—'

  const ports = (n: FlowNode) => ({ rx: n.x + CARD_W, ry: n.y + CARD_H / 2, lx: n.x, ly: n.y + CARD_H / 2 })

  const saveAsPlaylist = async () => {
    if (!flowTracks.length || saving) return
    setSaving(true)
    try {
      const pl = await createPlaylist.mutateAsync({ name: `${title} — Storyline`, description: `Set armado en el storyline (${flowTracks.length} tracks)` })
      for (const t of flowTracks) {
        try { await addToPlaylist.mutateAsync({ playlistId: pl.id, trackId: t.id }) } catch { /* dup */ }
      }
      navigate(`/playlist/${pl.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header con stats */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-surface/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary-light">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-fg leading-tight">Storyline</div>
            <div className="text-[11px] text-fg-faint">{title}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-fg-soft">
          <Stat icon={<Music2 size={12} />} label="Tracks" value={flow.length} />
          <Stat icon={<Activity size={12} />} label="Artistas" value={artists} />
          <Stat icon={<Clock size={12} />} label="Set" value={`~${Math.round(totalMs / 60000)} min`} />
          <Stat icon={<Activity size={12} />} label="BPM" value={range(bpms)} />
          <Stat icon={<Zap size={12} />} label="Energía" value={range(ens, (n) => n.toFixed(2))} />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-fg-soft">
            <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} className="accent-primary" />
            Compacto
          </label>
          <ToolBtn onClick={reset}><RotateCcw size={13} /> Reset</ToolBtn>
          <ToolBtn onClick={straighten}><AlignVerticalSpaceAround size={13} /> Alinear</ToolBtn>
          <ToolBtn onClick={() => suggestions[0] && addTrack(suggestions[0])}><Plus size={13} /> Agregar</ToolBtn>
          <Button size="sm" onClick={saveAsPlaylist} disabled={saving || !flowTracks.length}>
            <Save size={14} /> {saving ? 'Guardando…' : 'Guardar playlist'}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Canvas */}
        <div
          ref={areaRef}
          onClick={() => onSelect?.('')}
          className="relative flex-1 overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:24px_24px]"
        >
          <div className="relative" style={{ width: Math.max(900, flow.length * GAP_X + 300), height: 700 }}>
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {flow.slice(0, -1).map((n, i) => {
                const p1 = ports(n)
                const p2 = ports(flow[i + 1])
                const midx = (p1.rx + p2.lx) / 2
                const d = `M ${p1.rx} ${p1.ry} C ${midx} ${p1.ry}, ${midx} ${p2.ly}, ${p2.lx} ${p2.ly}`
                return <path key={i} d={d} fill="none" stroke="rgba(167,139,250,.5)" strokeWidth={2} />
              })}
            </svg>
            {flow.map((n) => {
              const t = byId.get(n.id)
              if (!t) return null
              return (
                <FlowCard
                  key={n.id}
                  node={n}
                  track={t}
                  compact={compact}
                  selected={n.id === selectedId}
                  onDown={onDown}
                  onSelect={() => onSelect?.(t.id)}
                />
              )
            })}
            {flow.length === 0 && (
              <div className="absolute left-1/2 top-40 -translate-x-1/2 text-center text-[13px] text-fg-faint">
                No hay tracks en este scope. Agregá desde los sugeridos →
              </div>
            )}
            <div className="absolute bottom-3 left-3 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-[11px] text-fg-faint backdrop-blur">
              Arrastrá las cards para reordenar · click en un sugerido lo agrega al final
            </div>
          </div>
        </div>

        {/* Bandeja de sugeridos */}
        <aside className="w-64 shrink-0 overflow-y-auto border-l border-border bg-surface/30 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-faint">
            Sugeridos <span className="font-normal normal-case text-fg-faint">· compatibles con el cierre</span>
          </div>
          <div className="space-y-2">
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => addTrack(t)}
                title="Agregar al storyline"
                className="group flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface p-2 text-left transition-colors hover:border-primary hover:bg-surface-raised cursor-pointer"
              >
                <CoverArt id={t.id} url={t.cover_url} size={36} className="shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-fg">{t.title}</div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-fg-soft tabular-nums">
                    <span>{t.bpm ?? '—'}</span>
                    <span style={{ color: camelotColor(t.key_camelot) }}>{t.key_camelot ?? '—'}</span>
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: energyColor(t.energy) }} />
                  </div>
                </div>
                <Plus size={14} className="shrink-0 text-fg-faint group-hover:text-primary-light" />
              </button>
            ))}
            {suggestions.length === 0 && <p className="text-[12px] text-fg-faint">Todo el scope ya está en el flow.</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}

function FlowCard({
  node, track, compact, selected, onDown, onSelect,
}: {
  node: FlowNode
  track: Track
  compact: boolean
  selected: boolean
  onDown: (e: React.MouseEvent, n: FlowNode) => void
  onSelect: () => void
}) {
  return (
    <div
      onMouseDown={(e) => onDown(e, node)}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      style={{ left: node.x, top: node.y, width: CARD_W }}
      className={`absolute cursor-grab overflow-hidden rounded-xl border bg-surface shadow-card transition-shadow active:cursor-grabbing ${
        selected ? 'border-primary shadow-glow-purple' : 'border-border hover:border-border-strong'
      }`}
    >
      <CoverArt id={track.id} url={track.cover_url} size={CARD_W} className={compact ? '!h-16 w-full' : '!h-24 w-full'} />
      <div className="space-y-1 p-2.5">
        <div className="truncate text-[12px] font-semibold text-fg" title={track.title}>{track.title}</div>
        {!compact && <div className="truncate text-[11px] text-fg-soft">{track.artist}</div>}
        <div className="flex items-center gap-2 font-mono text-[10px] text-fg-soft tabular-nums">
          <span>{track.bpm ?? '—'}</span>
          <span style={{ color: camelotColor(track.key_camelot) }}>{track.key_camelot ?? '—'}</span>
          <span className="ml-auto inline-block h-2 w-2 rounded-full" style={{ background: energyColor(track.energy), boxShadow: `0 0 6px ${energyColor(track.energy)}88` }} />
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-fg-faint">{icon}</span>
      <span className="text-fg-faint">{label}:</span>
      <span className="font-mono text-fg tabular-nums">{value}</span>
    </span>
  )
}

function ToolBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg cursor-pointer"
    >
      {children}
    </button>
  )
}
