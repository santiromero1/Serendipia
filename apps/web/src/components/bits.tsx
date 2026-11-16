import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import type { Track } from '@/lib/types'
import { keyColor } from '@/lib/harmony'
import { useLibrary } from '@/stores/library'
import { usePlayer } from '@/stores/player'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '–'
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`
}

export function fmtLong(sec: number): string {
  const m = Math.round(sec / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

export const fmt1 = (v: number | null | undefined) => (v == null ? '–' : v.toFixed(1))

export function range<T>(items: T[], pick: (t: T) => number | null): string {
  const vals = items.map(pick).filter((v): v is number => v != null)
  if (!vals.length) return '–'
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const f = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`
}

export function Cover({ track, size, className }: { track: Track; size: number; className?: string }) {
  const style = { width: size, height: size }
  return track.cover ? (
    <img
      src={`/data/covers/${track.id}.jpg`}
      alt=""
      loading="lazy"
      draggable={false}
      style={style}
      className={cx('shrink-0 rounded-[3px] bg-raised object-cover', className)}
    />
  ) : (
    <div style={style} className={cx('grid shrink-0 place-items-center rounded-[3px] bg-raised text-ghost', className)}>
      <span className="num" style={{ fontSize: Math.max(9, size / 4) }}>
        {track.artist.slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

export function KeyChip({ k }: { k: string | null }) {
  return (
    <span
      className="num inline-flex h-[18px] min-w-[30px] items-center justify-center rounded-[3px] px-1 text-[11px]"
      style={k ? { background: `color-mix(in oklch, ${keyColor(k)} 22%, transparent)`, color: keyColor(k) } : undefined}
    >
      {k ?? <span className="text-ghost">–</span>}
    </span>
  )
}

/** Valor 1 a 10 como número y barra fina. */
export function Meter({ value, width = 34 }: { value: number | null; width?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={value == null ? 'Sin análisis' : undefined}>
      <span className="num w-[22px] text-right text-[11px] text-soft">{fmt1(value)}</span>
      <span className="h-[3px] rounded-full bg-line" style={{ width }}>
        {value != null && <span className="block h-full rounded-full bg-soft" style={{ width: `${(value / 10) * 100}%` }} />}
      </span>
    </span>
  )
}

/** Fila compacta de datos de un tema: BPM, tonalidad, energía, bailabilidad. */
export function Chips({ track }: { track: Track }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
      <span className="num text-soft">{track.bpm ?? '–'}</span>
      <KeyChip k={track.key} />
      <span className="num text-faint" title="Energía · Bailabilidad">
        E {fmt1(track.energy)} · Ba {fmt1(track.dance)}
      </span>
      {track.stars != null && (
        <span className="text-faint" title="Estrellas de rekordbox">
          {'★'.repeat(track.stars)}
        </span>
      )}
    </span>
  )
}

export function PlayButton({ id, size = 26, className }: { id: string; size?: number; className?: string }) {
  const active = usePlayer((s) => s.trackId === id)
  const playing = usePlayer((s) => s.playing && s.trackId === id)
  const play = usePlayer((s) => s.play)
  const canPlay = useLibrary((s) => s.canPlay)
  if (!canPlay) return null
  return (
    <button
      aria-label={playing ? 'Pausar' : 'Escuchar'}
      onClick={(e) => {
        e.stopPropagation()
        play(id)
      }}
      style={{ width: size, height: size }}
      className={cx(
        'grid shrink-0 place-items-center rounded-full transition-colors',
        active ? 'bg-fg text-bg' : 'bg-raised text-soft hover:bg-fg hover:text-bg',
        className,
      )}
    >
      {playing ? <Pause size={size * 0.42} fill="currentColor" /> : <Play size={size * 0.42} fill="currentColor" className="translate-x-[0.5px]" />}
    </button>
  )
}

export function Btn({
  variant = 'ghost',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' | 'line'; children: ReactNode }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 text-[12px] font-medium transition-colors disabled:opacity-40',
        variant === 'solid' && 'bg-fg text-bg hover:bg-soft',
        variant === 'line' && 'border border-line text-soft hover:border-line-strong hover:text-fg',
        variant === 'ghost' && 'text-soft hover:bg-raised hover:text-fg',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex h-7 rounded-[5px] border border-line p-[2px]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-[3px] px-2.5 text-[12px] transition-colors',
            value === o.value ? 'bg-raised text-fg' : 'text-faint hover:text-soft',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <label className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-line pl-2 text-[12px] text-faint">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-full rounded-[5px] bg-transparent pr-1 text-fg outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
