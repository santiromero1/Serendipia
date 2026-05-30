interface Props {
  min: number
  max: number
  step?: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
  format?: (v: number) => string
}

export function RangeSlider({ min, max, step = 1, valueMin, valueMax, onChange, format }: Props) {
  const fmt = format ?? ((v: number) => String(v))
  const span = max - min || 1
  const leftPct = ((valueMin - min) / span) * 100
  const rightPct = ((valueMax - min) / span) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="dual-range relative h-4 flex items-center">
        <div className="absolute h-1 w-full rounded-full bg-surface-raised" />
        <div
          className="absolute h-1 rounded-full bg-primary"
          style={{ left: `${leftPct}%`, width: `${Math.max(0, rightPct - leftPct)}%` }}
        />
        <input
          type="range"
          aria-label="Mínimo"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax), valueMax)}
        />
        <input
          type="range"
          aria-label="Máximo"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin))}
        />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-fg-soft tabular-nums">
        <span>{fmt(valueMin)}</span>
        <span>{fmt(valueMax)}</span>
      </div>
    </div>
  )
}
