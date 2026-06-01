import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'
import { useTrack } from '@/hooks/useTracks'
import { useTrackPeaks } from '@/hooks/useTrackPeaks'
import { CoverArt } from '@/components/ui/CoverArt'
import { Waveform } from './Waveform'
import { useUIStore } from '@/stores/ui'

function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Player() {
  const currentTrackId = usePlayerStore((s) => s.currentTrackId)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const position = usePlayerStore((s) => s.position)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const toggle = usePlayerStore((s) => s.toggle)
  const seekRatio = usePlayerStore((s) => s.seekRatio)
  const setVolume = usePlayerStore((s) => s.setVolume)

  const openDetail = useUIStore((s) => s.openTrackDetail)
  const { data: track } = useTrack(currentTrackId ?? undefined)
  const { data: peaks } = useTrackPeaks(currentTrackId ?? undefined)

  if (!currentTrackId || !track) return null

  const progress = duration > 0 ? position / duration : 0
  const muted = volume === 0

  return (
    <footer
      role="region"
      aria-label="Reproductor"
      className="sticky bottom-0 z-30 flex h-16 items-center gap-4 border-t border-border bg-surface/95 px-4 backdrop-blur-md"
    >
      {/* Cover + título → click abre detalle */}
      <button
        type="button"
        onClick={() => openDetail(track.id)}
        className="flex min-w-0 max-w-[260px] items-center gap-3 text-left cursor-pointer hover:opacity-90 transition-opacity"
      >
        <CoverArt id={track.id} url={track.cover_url} size={44} className="rounded-md shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-fg">{track.title}</div>
          <div className="truncate text-[11px] text-fg-soft">{track.artist}</div>
        </div>
      </button>

      {/* Play/pause */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fg text-background hover:scale-105 transition-transform cursor-pointer"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="translate-x-[1px]" />}
      </button>

      {/* Waveform + tiempos */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="font-mono text-[11px] tabular-nums text-fg-faint w-10 text-right">{fmt(position)}</span>
        <div className="min-w-0 flex-1">
          {peaks && peaks.length > 0 ? (
            <Waveform
              peaks={peaks}
              progress={progress}
              height={40}
              onSeek={seekRatio}
            />
          ) : (
            // Si no hay peaks aún, mini barra de progreso clásica
            <div
              className="h-1.5 w-full cursor-pointer rounded-full bg-surface-raised"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                seekRatio((e.clientX - rect.left) / rect.width)
              }}
            >
              <div
                className="h-full rounded-full bg-primary-light"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
        <span className="font-mono text-[11px] tabular-nums text-fg-faint w-10">{fmt(duration)}</span>
      </div>

      {/* Volumen */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setVolume(muted ? 0.85 : 0)}
          aria-label={muted ? 'Quitar mute' : 'Silenciar'}
          className="text-fg-soft hover:text-fg cursor-pointer transition-colors"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volumen"
          className="h-1 w-20 cursor-pointer accent-primary"
        />
      </div>
    </footer>
  )
}
