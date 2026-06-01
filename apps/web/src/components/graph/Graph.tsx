import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { Track } from '@serendipia/types'
import { computeConnections } from '@/lib/compatibility'
import { CLUSTERS, trackCluster, visibleClusters, type Cluster } from '@/lib/genres'
import { camelotColor } from '@/lib/camelot'
import { energyColor } from '@/lib/format'
import { CoverArt } from '@/components/ui/CoverArt'
import { EnergyDot } from '@/components/ui/EnergyBar'

export type ColorBy = 'energy' | 'genre' | 'key'

function nodeColor(node: GraphNode, colorBy: ColorBy): string {
  if (colorBy === 'energy') return energyColor(node.track.energy)
  if (colorBy === 'key') return camelotColor(node.track.key_camelot)
  return node.cluster.color
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  track: Track
  degree: number
  cluster: Cluster
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  score: number
}

interface Props {
  tracks: Track[]
  threshold?: number
  colorBy?: ColorBy
  onSelect?: (trackId: string) => void
  onHoverChange?: (track: Track | null) => void
  showClusterLabels?: boolean
}

const CARD_W = 96
const CARD_H = 120
// Mini-card en Browse: cover + título (lo mínimo para reconocer un track)
const MINI_W = 80
const MINI_H = 92
const MINI_COVER_H = 60

type ViewMode = 'auto' | 'dots'
type Lod = 'overview' | 'browse' | 'detail'

const ZOOM_BROWSE = 0.55
const ZOOM_DETAIL = 1.1

function computeLod(k: number, mode: ViewMode): Lod {
  if (mode === 'dots') return 'overview'
  if (k < ZOOM_BROWSE) return 'overview'
  if (k < ZOOM_DETAIL) return 'browse'
  return 'detail'
}

function dotRadius(degree: number) {
  return Math.min(7 + degree * 1.2, 16)
}

function buildGraph(tracks: Track[], threshold: number) {
  const nodes: GraphNode[] = tracks.map((t) => ({
    id: t.id,
    track: t,
    degree: 0,
    cluster: trackCluster(t),
  }))
  const connections = computeConnections(tracks, threshold)
  const degree = new Map<string, number>()
  for (const c of connections) {
    degree.set(c.aId, (degree.get(c.aId) ?? 0) + 1)
    degree.set(c.bId, (degree.get(c.bId) ?? 0) + 1)
  }
  for (const n of nodes) n.degree = degree.get(n.id) ?? 0
  const links: GraphLink[] = connections.map((c) => ({
    source: c.aId,
    target: c.bId,
    score: c.score,
  }))
  return { nodes, links }
}

/** path SVG curvado para una arista (cuadratic bezier con offset perpendicular) */
function edgePath(sx: number, sy: number, tx: number, ty: number): string {
  const mx = (sx + tx) / 2
  const my = (sy + ty) / 2
  const dx = tx - sx
  const dy = ty - sy
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const off = Math.min(40, len * 0.1)
  const cx = mx - (dy / len) * off
  const cy = my + (dx / len) * off
  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`
}

export function Graph({
  tracks,
  threshold = 0.65,
  colorBy = 'energy',
  onSelect,
  onHoverChange,
  showClusterLabels = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)

  const [size, setSize] = useState({ w: 800, h: 600 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('auto')
  const [zoomK, setZoomK] = useState(0.45)
  const [, tick] = useState(0)

  const { nodes, links } = useMemo(() => buildGraph(tracks, threshold), [tracks, threshold])
  const lod = computeLod(zoomK, viewMode)

  // Tamaño del contenedor
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Simulación. Collision al tamaño máximo (card) para que nunca haya overlap
  // a la vista más densa. En modo dots se relaja para que se compriman.
  useEffect(() => {
    if (!nodes.length) return

    for (const n of nodes) {
      if (n.x == null) n.x = n.cluster.x + (Math.random() - 0.5) * 60
      if (n.y == null) n.y = n.cluster.y + (Math.random() - 0.5) * 60
    }

    const sim = d3
      .forceSimulation<GraphNode>(nodes)
      .force('charge', d3.forceManyBody().strength(viewMode === 'dots' ? -120 : -320))
      .force('clusterX', d3.forceX<GraphNode>((d) => d.cluster.x).strength(0.14))
      .force('clusterY', d3.forceY<GraphNode>((d) => d.cluster.y).strength(0.14))
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => 120 + (1 - d.score) * 60)
          .strength((d) => d.score * 0.32),
      )
      .force(
        'collision',
        d3
          .forceCollide<GraphNode>()
          .radius((d) => (viewMode === 'dots' ? dotRadius(d.degree) + 6 : CARD_W / 2 + 12))
          .strength(0.95),
      )
      .alpha(1)
      .alphaDecay(0.025)
      .on('tick', () => tick((n) => (n + 1) % 1_000_000))

    return () => {
      sim.stop()
    }
  }, [nodes, links, viewMode])

  // Zoom & pan — track k para LOD. Initial scale 0.45 → arrancás en Overview.
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return
    const svg = d3.select(svgRef.current)
    const g = d3.select(gRef.current)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2.5])
      .on('zoom', (e) => {
        g.attr('transform', e.transform.toString())
        setZoomK(e.transform.k)
      })
    svg.call(zoom).on('dblclick.zoom', null)

    const initial = d3.zoomIdentity.translate(size.w / 2, size.h / 2).scale(0.45)
    svg.call(zoom.transform, initial)
    setZoomK(0.45)

    return () => {
      svg.on('.zoom', null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h])

  // Vecinos del nodo en hover
  const neighbors = useMemo(() => {
    if (!hovered) return null
    const set = new Set<string>([hovered])
    for (const l of links) {
      const s = (typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) as string
      const t = (typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) as string
      if (s === hovered) set.add(t)
      if (t === hovered) set.add(s)
    }
    return set
  }, [hovered, links])

  const onEnter = (id: string, track: Track) => {
    setHovered(id)
    onHoverChange?.(track)
  }
  const onLeave = () => {
    setHovered(null)
    onHoverChange?.(null)
  }

  // Opacidades dependientes de LOD (cross-fade entre tiers)
  const opOverview = lod === 'overview' ? 1 : 0
  const opBrowse = lod === 'browse' ? 1 : 0
  const opDetail = lod === 'detail' ? 1 : 0
  const labelOpacity = lod === 'overview' ? 0.55 : 0.18
  const blobOpacity = lod === 'overview' ? 0 : 0.12

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Toggle Auto / Puntos */}
      <div className="absolute right-3 top-3 z-10 flex rounded-lg border border-border bg-surface/90 p-0.5 shadow-md backdrop-blur">
        <ModeBtn active={viewMode === 'auto'} onClick={() => setViewMode('auto')} label="Auto (zoom decide)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
            <circle cx="3" cy="7" r="1" fill="currentColor" />
            <circle cx="7" cy="7" r="1.8" />
            <rect x="9.5" y="4" width="3.5" height="6" rx="0.7" />
          </svg>
          Auto
        </ModeBtn>
        <ModeBtn active={viewMode === 'dots'} onClick={() => setViewMode('dots')} label="Solo puntos">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
            <circle cx="4" cy="4" r="2.2" />
            <circle cx="10.5" cy="5" r="1.6" />
            <circle cx="6" cy="10" r="1.8" />
          </svg>
          Puntos
        </ModeBtn>
      </div>

      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="cursor-grab active:cursor-grabbing"
      >
        <defs>
          {CLUSTERS.map((c) => (
            <radialGradient key={`gr-${c.id}`} id={`cluster-blob-${c.id}`}>
              <stop offset="0%" stopColor={c.color} stopOpacity={1} />
              <stop offset="100%" stopColor={c.color} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        <g ref={gRef}>
          {/* Cluster blobs (atmósfera por género) */}
          <g style={{ opacity: blobOpacity, transition: 'opacity 220ms ease-out' }} pointerEvents="none">
            {CLUSTERS.map((c) => (
              <circle
                key={c.id}
                cx={c.x}
                cy={c.y + 40}
                r={340}
                fill={`url(#cluster-blob-${c.id})`}
              />
            ))}
          </g>

          {/* Labels de cluster */}
          {showClusterLabels &&
            visibleClusters().map((c) => (
              <text
                key={c.id}
                x={c.x}
                y={c.y - 240}
                textAnchor="middle"
                fontSize={13}
                fontFamily="Inter, sans-serif"
                fontWeight={600}
                fill={c.color}
                style={{
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  opacity: labelOpacity,
                  transition: 'opacity 220ms ease-out',
                }}
              >
                {c.label}
              </text>
            ))}

          {/* Aristas curvadas */}
          {links.map((l, i) => {
            const s = l.source as GraphNode
            const t = l.target as GraphNode
            if (!s || !t || s.x == null || t.x == null) return null
            const sx = s.x, sy = s.y ?? 0, tx = t.x, ty = t.y ?? 0
            const involved = !neighbors || (neighbors.has(s.id) && neighbors.has(t.id))
            const baseOp = 0.14 + l.score * 0.42
            return (
              <path
                key={i}
                d={edgePath(sx, sy, tx, ty)}
                stroke="#7c3aed"
                strokeWidth={(0.5 + l.score * 1.4) * (hovered ? (involved ? 1.4 : 1) : 1)}
                strokeOpacity={involved ? baseOp : 0.04}
                fill="none"
                style={{ transition: 'stroke-opacity 180ms ease-out, stroke-width 180ms ease-out' }}
                pointerEvents="none"
              />
            )
          })}

          {/* Nodos: 3 capas cross-fade por LOD */}
          {nodes.map((n) => {
            const dim = neighbors && !neighbors.has(n.id)
            const isHover = hovered === n.id
            const x = n.x ?? 0
            const y = n.y ?? 0
            const col = nodeColor(n, colorBy)
            return (
              <g key={n.id} style={{ opacity: dim ? 0.18 : 1, transition: 'opacity 180ms ease-out' }}>
                {/* OVERVIEW — dot color cluster */}
                <g
                  transform={`translate(${x}, ${y})`}
                  style={{
                    opacity: opOverview,
                    transition: 'opacity 180ms ease-out',
                    pointerEvents: opOverview > 0.5 ? 'auto' : 'none',
                  }}
                  onMouseEnter={() => onEnter(n.id, n.track)}
                  onMouseLeave={onLeave}
                  onClick={() => onSelect?.(n.id)}
                  cursor="pointer"
                >
                  {isHover && (
                    <circle
                      r={dotRadius(n.degree) + 5}
                      fill="none"
                      stroke={col}
                      strokeOpacity={0.6}
                      strokeWidth={1.2}
                    />
                  )}
                  <circle
                    r={isHover ? dotRadius(n.degree) * 1.2 : dotRadius(n.degree)}
                    fill={col}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={1}
                    style={{
                      filter: isHover ? `drop-shadow(0 0 8px ${col})` : undefined,
                      transition: 'r 180ms ease-out, filter 180ms ease-out',
                    }}
                  />
                </g>

                {/* BROWSE — mini-card 80×92: cover + título */}
                <foreignObject
                  x={x - MINI_W / 2}
                  y={y - MINI_H / 2}
                  width={MINI_W}
                  height={MINI_H}
                  style={{
                    overflow: 'visible',
                    opacity: opBrowse,
                    transition: 'opacity 180ms ease-out',
                    pointerEvents: opBrowse > 0.5 ? 'auto' : 'none',
                  }}
                >
                  <div
                    onMouseEnter={() => onEnter(n.id, n.track)}
                    onMouseLeave={onLeave}
                    onClick={() => onSelect?.(n.id)}
                    style={{
                      width: MINI_W,
                      height: MINI_H,
                      transform: isHover ? 'scale(1.06)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    className={`group cursor-pointer overflow-hidden rounded-md border bg-surface ${
                      isHover ? 'border-primary shadow-glow-purple' : 'border-border'
                    }`}
                  >
                    <CoverArt id={n.track.id} url={n.track.cover_url} size={MINI_W} className="!h-[60px] w-full" />
                    <div className="flex items-center gap-1 px-1.5" style={{ height: MINI_H - MINI_COVER_H }}>
                      <div
                        className="flex-1 truncate text-[10px] font-semibold leading-tight text-fg"
                        title={n.track.title}
                      >
                        {n.track.title}
                      </div>
                      <EnergyDot energy={n.track.energy} className="!h-1.5 !w-1.5" />
                    </div>
                  </div>
                </foreignObject>

                {/* DETAIL — card completa 96×120 */}
                <foreignObject
                  x={x - CARD_W / 2}
                  y={y - CARD_H / 2}
                  width={CARD_W}
                  height={CARD_H}
                  style={{
                    overflow: 'visible',
                    opacity: opDetail,
                    transition: 'opacity 180ms ease-out',
                    pointerEvents: opDetail > 0.5 ? 'auto' : 'none',
                  }}
                >
                  <div
                    onMouseEnter={() => onEnter(n.id, n.track)}
                    onMouseLeave={onLeave}
                    onClick={() => onSelect?.(n.id)}
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      transform: isHover ? 'scale(1.06)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    className={`group cursor-pointer overflow-hidden rounded-lg border bg-surface ${
                      isHover ? 'border-primary shadow-glow-purple' : 'border-border'
                    }`}
                  >
                    <CoverArt id={n.track.id} url={n.track.cover_url} size={CARD_W} className="!h-[80px] w-full" />
                    <div className="flex h-[40px] flex-col justify-center gap-0.5 px-2">
                      <div
                        className="truncate text-[11px] font-semibold leading-tight text-fg"
                        title={n.track.title}
                      >
                        {n.track.title}
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-fg-soft tabular-nums">
                        <span>{n.track.bpm ?? '—'}</span>
                        <span className="text-fg-faint">·</span>
                        <span>{n.track.key_camelot ?? '—'}</span>
                        <EnergyDot energy={n.track.energy} className="ml-auto !h-2 !w-2" />
                      </div>
                    </div>
                  </div>
                </foreignObject>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function ModeBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-primary text-white' : 'text-fg-soft hover:bg-surface hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}
