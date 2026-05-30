import type { Track } from '@serendipia/types'
import { EnergyBar, EnergyDot } from '@/components/ui/EnergyBar'
import { Badge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import { sourceBadge } from '@/lib/format'
import { useUIStore } from '@/stores/ui'

export function TrackCard({ track }: { track: Track }) {
  const openDetail = useUIStore((s) => s.openTrackDetail)
  const badge = sourceBadge(track.metadata_status, track.metadata_source)
  const moment = track.tags.filter((t) => t.tag_type === 'moment' || t.tag_type === 'custom')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openDetail(track.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDetail(track.id))}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary hover:shadow-glow-purple"
    >
      <div className="flex items-start gap-2.5">
        <EnergyDot energy={track.energy} className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-fg" title={track.title}>{track.title}</h3>
          <p className="truncate text-[13px] text-fg-soft" title={track.artist}>{track.artist}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AddToPlaylistMenu trackId={track.id} />
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-[13px] text-fg">
        <span className="tabular-nums">{track.bpm ?? '—'}</span>
        <span className="text-fg-faint">·</span>
        <span>{track.key_camelot ?? '—'}</span>
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
