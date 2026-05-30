import type { Track } from '@serendipia/types'
import { EnergyBar, EnergyDot } from '@/components/ui/EnergyBar'
import { Chip } from '@/components/ui/Chip'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import { useUIStore } from '@/stores/ui'

/** Fila de la vista Lista (CKM/3-design.md §4.2). Columnas alineadas con LibraryList. */
export function TrackListRow({ track }: { track: Track }) {
  const openDetail = useUIStore((s) => s.openTrackDetail)
  const moment = track.tags.filter((t) => t.tag_type === 'moment' || t.tag_type === 'custom')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openDetail(track.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDetail(track.id))}
      className="grid cursor-pointer grid-cols-[16px_minmax(0,2.4fr)_56px_44px_120px_minmax(0,1fr)_minmax(0,1.4fr)_32px] items-center gap-3 rounded-lg px-3 h-12 hover:bg-surface-raised transition-colors"
    >
      <EnergyDot energy={track.energy} />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-fg">{track.title}</div>
        <div className="truncate text-[11px] text-fg-soft">{track.artist}</div>
      </div>
      <div className="font-mono text-[13px] text-fg tabular-nums">{track.bpm ?? '—'}</div>
      <div className="font-mono text-[13px] text-fg">{track.key_camelot ?? '—'}</div>
      <EnergyBar energy={track.energy} showValue={false} />
      <div className="truncate text-[12px] text-fg-soft">{track.genre[0] ?? '—'}</div>
      <div className="flex min-w-0 flex-wrap gap-1 overflow-hidden">
        {moment.slice(0, 2).map((t) => (
          <Chip key={t.id} tone={t.tag_type === 'custom' ? 'custom' : 'moment'}>{t.tag}</Chip>
        ))}
      </div>
      <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
        <AddToPlaylistMenu trackId={track.id} />
      </div>
    </div>
  )
}
