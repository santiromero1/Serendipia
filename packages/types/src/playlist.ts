import type { TrackSummary } from './track'

export interface Playlist {
  id: string
  user_id: string
  name: string
  description: string | null
  track_count: number
  created_at: string
  updated_at: string
}

export interface PlaylistWithTracks extends Playlist {
  tracks: (TrackSummary & { position: number })[]
}

export type ExportFormat = 'xml' | 'm3u'
