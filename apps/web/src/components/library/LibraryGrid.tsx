import type { Track } from '@serendipia/types'
import { TrackCard } from '@/components/track/TrackCard'

export function LibraryGrid({ tracks }: { tracks: Track[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {tracks.map((t) => (
        <TrackCard key={t.id} track={t} />
      ))}
    </div>
  )
}
