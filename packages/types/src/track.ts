// Tipos de Track — fuente única de verdad, alineada con 5-api.md §2 y la
// migración de 7-impl.md §2.2. El frontend (mock) y el futuro backend los comparten.

export type MetadataStatus = 'pending' | 'enriched' | 'ai_inferred' | 'manual'

export type MetadataSource = 'spotify' | 'getsongbpm' | 'audio_analysis' | 'ai' | 'manual' | 'rekordbox'

export type TagType = 'moment' | 'genre' | 'custom'

export type TagSource = 'ai' | 'user'

/** Etiquetas de momento de set sugeridas por la IA (lista cerrada). */
export type DJTag =
  | 'explotarla' | 'peak' | 'calentar' | 'cierre'
  | 'bajarla' | 'emotional' | 'underground' | 'comercial'
  | 'apertura' | 'madrugada' | 'after'

export const DJ_MOMENT_TAGS: DJTag[] = [
  'apertura', 'calentar', 'peak', 'explotarla', 'comercial',
  'emotional', 'bajarla', 'cierre', 'madrugada', 'after', 'underground',
]

export interface TrackTag {
  id: string
  tag: string
  tag_type: TagType
  source: TagSource
}

export interface Track {
  id: string
  user_id: string
  title: string
  artist: string
  bpm: number | null
  key_camelot: string | null       // "8A", "11B", etc.
  key_standard: string | null      // "Am", "F#", etc.
  energy: number | null            // 0.0 - 1.0
  danceability: number | null      // 0.0 - 1.0
  valence: number | null           // 0.0 - 1.0
  year: number | null
  genre: string[]
  duration_ms: number | null
  spotify_id: string | null
  rating: number | null            // 1-5 estrellas (DJ), null = sin valorar
  format: string | null            // 'mp3' | 'wav' | 'aiff' | 'flac' — solo si hay archivo
  bitrate: number | null           // kbps — solo si hay archivo
  audio_file_url: string | null    // blob URL en frontend; Supabase Storage en backend
  cover_url: string | null         // blob URL del cover embebido, o URL de Spotify
  metadata_status: MetadataStatus
  metadata_source: MetadataSource
  notes: string | null
  tags: TrackTag[]
  created_at: string               // ISO 8601
  updated_at: string
}

/** Versión compacta para listas y chat. */
export interface TrackSummary {
  id: string
  title: string
  artist: string
  bpm: number | null
  key_camelot: string | null
  energy: number | null
  metadata_status: MetadataStatus
  tags: Pick<TrackTag, 'tag' | 'tag_type'>[]
}
