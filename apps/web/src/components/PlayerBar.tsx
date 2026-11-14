import { useRef } from 'react'
import { Pause, Play } from 'lucide-react'
import { useLibrary } from '@/stores/library'
import { usePlayer } from '@/stores/player'
import { useUI } from '@/stores/ui'
import { Chips, Cover, cx, fmtDuration } from './bits'

function Waveform({ peaks, progress, onSeek }: { peaks: number[] | undefined; progress: number; onSeek: (f: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const bars = peaks ?? []
  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Posición"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.02))
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.02))
      }}
      onPointerDown={(e) => {
        const r = ref.current!.getBoundingClientRect()
        onSeek((e.clientX - r.left) / r.width)
      }}
      className="relative h-9 min-w-0 flex-1 cursor-pointer"
    >
      {bars.length ? (
        <svg viewBox={`0 0 ${bars.length} 100`} preserveAspectRatio="none" className="h-full w-full">
          {bars.map((v, i) => {
            const h = Math.max(3, (v / 255) * 96)
            return (
              <rect
                key={i}
                x={i + 0.2}
                width={0.6}
                y={50 - h / 2}
                height={h}
                fill={i / bars.length < progress ? 'var(--color-fg)' : 'var(--color-line-strong)'}
              />
            )
          })}
        </svg>
      ) : (
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-line">
          <div className="h-full bg-fg" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  )
}

export function PlayerBar() {
  const { trackId, playing, time, duration, fastPreview, error, toggle, seek, setFastPreview } = usePlayer()
  const track = useLibrary((s) => (trackId ? s.byId.get(trackId) : undefined))
  const peaks = useLibrary((s) => (trackId ? s.peaks[trackId] : undefined))
  const select = useUI((s) => s.select)
  const canPlay = useLibrary((s) => s.canPlay)

  if (!canPlay)
    return (
      <footer className="flex h-9 shrink-0 items-center border-t border-line px-4 text-[11.5px] text-faint">
        Para escuchar, abrí Serendipia en la compu donde está tu música (npm run dev). Acá ves la biblioteca y armás los sets.
      </footer>
    )

  return (
    <footer className="flex h-16 shrink-0 items-center gap-4 border-t border-line bg-surface px-4">
      <div className="flex w-[280px] shrink-0 items-center gap-3">
        {track ? (
          <button onClick={() => select(track.id)} className="flex min-w-0 items-center gap-3 text-left">
            <Cover track={track} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-fg">{track.title}</span>
              <span className="block truncate text-[12px] text-faint">{track.artist}</span>
            </span>
          </button>
        ) : (
          <span className="text-[12px] text-ghost">Nada sonando</span>
        )}
      </div>

      <button
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        disabled={!track}
        onClick={toggle}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fg text-bg transition-colors hover:bg-soft disabled:opacity-30"
      >
        {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="translate-x-[1px]" />}
      </button>

      <span className="num w-10 shrink-0 text-right text-[11px] text-faint">{fmtDuration(time)}</span>
      <Waveform peaks={peaks} progress={duration ? time / duration : 0} onSeek={seek} />
      <span className="num w-10 shrink-0 text-[11px] text-faint">{fmtDuration(duration || track?.duration)}</span>

      <div className="flex w-[230px] shrink-0 items-center justify-end gap-3">
        {error ? <span className="text-[11.5px] text-warn">{error}</span> : track && <Chips track={track} />}
        <button
          role="switch"
          aria-checked={fastPreview}
          title="Escucha rápida: arranca en el cuerpo del tema"
          onClick={() => setFastPreview(!fastPreview)}
          className={cx(
            'h-6 rounded-[4px] border px-1.5 text-[11px] transition-colors',
            fastPreview ? 'border-fg text-fg' : 'border-line text-faint hover:text-soft',
          )}
        >
          Rápida
        </button>
      </div>
    </footer>
  )
}
