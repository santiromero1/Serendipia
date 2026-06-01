import type { Track } from '@serendipia/types'
import { Play, Pause } from 'lucide-react'
import { EnergyBar } from '@/components/ui/EnergyBar'
import { Badge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { Stars } from '@/components/ui/Stars'
import { CoverArt } from '@/components/ui/CoverArt'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import { sourceBadge } from '@/lib/format'
import { camelotColor } from '@/lib/camelot'
import { useUIStore } from '@/stores/ui'
import { usePlayerStore } from '@/stores/player'

export function TrackCard({ track }: { track: Track }) {
  const openDetail = useUIStore((s) => s.openTrackDetail)
  const currentTrackId = usePlayerStore((s) => s.currentTrackId)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const play = usePlayerStore((s) => s.play)
  const toggle = usePlayerStore((s) => s.toggle)
  const badge = sourceBadge(track.metadata_status, track.metadata_source)
  const moment = track.tags.filter((t) => t.tag_type === 'moment' || t.tag_type === 'custom')
  const playingThis = currentTrackId === track.id && isPlaying

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openDetail(track.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDetail(track.id))}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary hover:shadow-glow-purple"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <CoverArt id={track.id} url={track.cover_url} size={48} className="rounded-lg" />
          {track.audio_file_url && (
            <button
              type="button"
              aria-label={playingThis ? 'Pausar' : 'Reproducir'}
              onClick={(e) => { e.stopPropagation(); currentTrackId === track.id ? toggle() : play(track.id, track.audio_file_url!) }}
              className="absolute inset-0 m-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
            >
              {playingThis ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="translate-x-[1px]" />}
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-fg" title={track.title}>{track.title}</h3>
          <p className="truncate text-[13px] text-fg-soft" title={track.artist}>{track.artist}</p>
          {track.rating != null && <Stars rating={track.rating} size={12} className="mt-1" />}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AddToPlaylistMenu trackId={track.id} />
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-[13px] text-fg">
        <span className="tabular-nums">{track.bpm ?? '—'}</span>
        <span className="text-fg-faint">·</span>
        <span style={{ color: camelotColor(track.key_camelot) }}>{track.key_camelot ?? '—'}</span>
        <span className="text-fg-faint">·</span>
        <EnergyBar energy={track.energy} className="flex-1" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {track.genre.slice(0, 1).map((g) => (
          <Chip key={g} tone="genre">{g}</Chip>
        ))}
        {moment.slice(0, 3).map((t) => (
          <Chip key={t.id} tone={t.tag_type === 'custom' ? 'custom' : 'moment'}>{t.tag}</Chip>
        ))}
        <span className="ml-auto">
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </span>
      </div>
    </div>
  )
}
