import { useMemo } from 'react'
import { camelotColor } from '@/lib/camelot'

interface Props {
  /** claves seleccionadas (Camelot, ej. "8A") */
  selected: string[]
  onToggle: (key: string) => void
  size?: number
}

const CX = 125
const CY = 125

/** Genera el path de un sector anular entre radios r0..r1 y ángulos a0..a1. */
function annular(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number): [number, number] => [CX + r * Math.cos(a), CY + r * Math.sin(a)]
  const [x0, y0] = p(r1, a0)
  const [x1, y1] = p(r1, a1)
  const [x2, y2] = p(r0, a1)
  const [x3, y3] = p(r0, a0)
  const laf = (a1 - a0) % (2 * Math.PI) > Math.PI ? 1 : 0
  return `M${x0} ${y0} A${r1} ${r1} 0 ${laf} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${laf} 0 ${x3} ${y3} Z`
}

interface Seg {
  key: string
  d: string
  lx: number
  ly: number
  color: string
}

/**
 * Rueda de Camelot interactiva — anillo interno A (menor) y externo B (mayor),
 * 12 posiciones. Click selecciona/deselecciona una clave para filtrar.
 */
export function CamelotWheel({ selected, onToggle, size }: Props) {
  const segs = useMemo<Seg[]>(() => {
    const rings = [
      { lo: 62, hi: 92, letter: 'A' },
      { lo: 92, hi: 120, letter: 'B' },
    ]
    const out: Seg[] = []
    for (let i = 0; i < 12; i++) {
      const num = i + 1
      const a0 = (i / 12) * 2 * Math.PI - Math.PI / 2 - Math.PI / 12
      const a1 = a0 + (2 * Math.PI) / 12
      for (const ring of rings) {
        const key = `${num}${ring.letter}`
        const mid = (a0 + a1) / 2
        const mr = (ring.lo + ring.hi) / 2
        out.push({
          key,
          d: annular(ring.lo, ring.hi, a0, a1),
          lx: CX + mr * Math.cos(mid),
          ly: CY + mr * Math.sin(mid),
          color: camelotColor(key),
        })
      }
    }
    return out
  }, [])

  const sel = new Set(selected)

  return (
    <svg
      viewBox="0 0 250 250"
      width={size}
      height={size}
      className="mx-auto block aspect-square w-full max-w-full select-none"
    >
      {segs.map((s) => {
        const on = sel.has(s.key)
        return (
          <g key={s.key} onClick={() => onToggle(s.key)} className="cursor-pointer">
            <path
              d={s.d}
              fill={s.color}
              opacity={sel.size === 0 || on ? 1 : 0.26}
              stroke={on ? '#fff' : 'rgba(0,0,0,.45)'}
              strokeWidth={on ? 2 : 1}
              style={{ transition: 'opacity 140ms ease-out' }}
            />
            <text
              x={s.lx}
              y={s.ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fontWeight={700}
              fontFamily="var(--font-mono)"
              fill="#0a0a0f"
              pointerEvents="none"
            >
              {s.key}
            </text>
          </g>
        )
      })}
      <circle cx={CX} cy={CY} r={58} fill="var(--color-surface)" stroke="rgba(255,255,255,.08)" />
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--color-fg)">
        {sel.size || 'KEY'}
      </text>
      <text x={CX} y={CY + 13} textAnchor="middle" fontSize={9} fill="var(--color-fg-soft)" style={{ letterSpacing: '0.12em' }}>
        {sel.size ? 'claves' : 'Camelot'}
      </text>
    </svg>
  )
}
