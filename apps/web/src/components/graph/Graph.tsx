import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { Track } from '@serendipia/types'
import { computeConnections } from '@/lib/compatibility'
import { energyColor } from '@/lib/format'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  track: Track
  degree: number
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  score: number
}

interface Props {
  tracks: Track[]
  threshold?: number
  onSelect?: (trackId: string) => void
  onHoverChange?: (track: Track | null) => void
}

function nodeRadius(degree: number): number {
  return 5 + Math.min(degree, 14) * 0.7 // 5 → ~15
}

function buildGraph(tracks: Track[], threshold: number) {
  const nodes: GraphNode[] = tracks.map((t) => ({ id: t.id, track: t, degree: 0 }))
  const connections = computeConnections(tracks, threshold)
  const degree = new Map<string, number>()
  for (const c of connections) {
    degree.set(c.aId, (degree.get(c.aId) ?? 0) + 1)
    degree.set(c.bId, (degree.get(c.bId) ?? 0) + 1)
  }
  for (const n of nodes) n.degree = degree.get(n.id) ?? 0
  const links: GraphLink[] = connections.map((c) => ({
    source: c.aId, target: c.bId, score: c.score,
  }))
  return { nodes, links, connections }
}

export function Graph({ tracks, threshold = 0.65, onSelect, onHoverChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)

  const [size, setSize] = useState({ w: 800, h: 600 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [, tick] = useState(0)

  const { nodes, links } = useMemo(() => buildGraph(tracks, threshold), [tracks, threshold])

  // Tamaño del contenedor
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Simulación de fuerzas
  useEffect(() => {
    if (!nodes.length) return
    const sim = d3
      .forceSimulation<GraphNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-160))
      .force('center', d3.forceCenter(size.w / 2, size.h / 2))
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => 70 + (1 - d.score) * 70)
          .strength((d) => d.score * 0.6),
      )
      .force('collision', d3.forceCollide<GraphNode>().radius((d) => nodeRadius(d.degree) + 4))
      .alpha(1)
      .alphaDecay(0.03)
      .on('tick', () => tick((n) => (n + 1) % 1_000_000))

    simRef.current = sim
    return () => {
      sim.stop()
      simRef.current = null
    }
  }, [nodes, links, size.w, size.h])

  // Zoom & pan (init una sola vez)
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return
    const svg = d3.select(svgRef.current)
    const g = d3.select(gRef.current)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (e) => g.attr('transform', e.transform.toString()))
    svg.call(zoom).on('dblclick.zoom', null)
    return () => {
      svg.on('.zoom', null)
    }
  }, [])

  // Vecinos del nodo en hover (para resaltar/atenuar)
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

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg ref={svgRef} width={size.w} height={size.h} className="cursor-grab active:cursor-grabbing">
        <g ref={gRef}>
          {/* Aristas */}
          {links.map((l, i) => {
            const s = l.source as GraphNode
            const t = l.target as GraphNode
            if (!s || !t || s.x == null || t.x == null) return null
            const involved = !neighbors || (neighbors.has(s.id) && neighbors.has(t.id))
            const baseOp = 0.12 + l.score * 0.4
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#7c3aed"
                strokeWidth={0.4 + l.score * 1.6}
                strokeOpacity={involved ? baseOp : 0.03}
                style={{ transition: 'stroke-opacity 150ms' }}
                pointerEvents="none"
              />
            )
          })}

          {/* Nodos */}
          {nodes.map((n) => {
            const dim = neighbors && !neighbors.has(n.id)
            const r = nodeRadius(n.degree)
            const color = energyColor(n.track.energy)
            const isHover = hovered === n.id
            return (
              <g
                key={n.id}
                transform={`translate(${n.x ?? 0}, ${n.y ?? 0})`}
                onMouseEnter={() => onEnter(n.id, n.track)}
                onMouseLeave={onLeave}
                onClick={() => onSelect?.(n.id)}
                style={{ cursor: 'pointer', opacity: dim ? 0.15 : 1, transition: 'opacity 150ms' }}
              >
                {isHover && (
                  <circle
                    r={r + 6}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.4}
                    strokeWidth={1.5}
                  />
                )}
                <circle
                  r={r}
                  fill={color}
                  stroke="#0a0a0f"
                  strokeWidth={1.5}
                  style={{
                    filter: isHover ? `drop-shadow(0 0 10px ${color})` : 'none',
                    transition: 'filter 150ms',
                  }}
                />
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
