import { energyColor } from '@/lib/format'
import { cx } from '@/lib/format'

interface Props {
  energy: number | null
  showValue?: boolean
  className?: string
}

export function EnergyBar({ energy, showValue = true, className }: Props) {
  const color = energyColor(energy)
  const pct = energy != null ? Math.round(energy * 100) : 0
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <div
        className="h-1.5 flex-1 rounded-full bg-surface-raised overflow-hidden"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Energía"
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {showValue && (
        <span className="font-mono text-[11px] text-fg-soft tabular-nums w-8 text-right">
          {energy != null ? energy.toFixed(2) : '—'}
        </span>
      )}
    </div>
  )
}

/** Punto de color de energía (usado en cards y filas). */
export function EnergyDot({ energy, className }: { energy: number | null; className?: string }) {
  return (
    <span
      className={cx('inline-block w-2.5 h-2.5 rounded-full shrink-0', className)}
      style={{ backgroundColor: energyColor(energy), boxShadow: `0 0 8px ${energyColor(energy)}66` }}
      aria-hidden
    />
  )
}
