import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Track } from '@serendipia/types'
import { TrackListRow } from '@/components/track/TrackListRow'

/** Vista Lista virtualizada (honra el criterio de 1000+ tracks sin lag). */
export function LibraryList({ tracks }: { tracks: Track[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 12,
  })

  return (
    <div className="flex flex-col">
      {/* Header de columnas */}
      <div className="grid grid-cols-[16px_minmax(0,2.4fr)_56px_44px_120px_minmax(0,1fr)_minmax(0,1.4fr)_32px] items-center gap-3 px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-fg-faint">
        <span />
        <span>Título · Artista</span>
        <span>BPM</span>
        <span>Clave</span>
        <span>Energía</span>
        <span>Género</span>
        <span>Tags</span>
        <span />
      </div>

      <div ref={parentRef} className="max-h-[calc(100vh-220px)] overflow-y-auto">
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {rowVirtualizer.getVirtualItems().map((vi) => (
            <div
              key={tracks[vi.index].id}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
            >
              <TrackListRow track={tracks[vi.index]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
