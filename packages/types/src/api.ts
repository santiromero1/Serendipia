import type { MetadataStatus } from './track'

export interface PaginationMeta {
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface ApiList<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiItem<T> {
  data: T
}

/** Filtros de GET /tracks (5-api.md §3). */
export interface TrackFilters {
  search?: string
  bpm_min?: number
  bpm_max?: number
  key_camelot?: string[]
  energy_min?: number
  energy_max?: number
  danceability_min?: number
  danceability_max?: number
  /** Emoción derivada de valence: -1 (oscura) … +1 (luminosa). */
  valence_min?: number
  valence_max?: number
  genre?: string[]
  tags?: string[]
  year_min?: number
  year_max?: number
  status?: MetadataStatus
  sort_by?: 'bpm' | 'energy' | 'year' | 'title' | 'created_at'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface CreateTrackInput {
  title: string
  artist: string
  notes?: string
}

export type UpdateTrackInput = Partial<{
  title: string
  artist: string
  bpm: number | null
  key_camelot: string | null
  key_standard: string | null
  energy: number | null
  danceability: number | null
  valence: number | null
  year: number | null
  genre: string[]
  rating: number | null
  notes: string | null
}>

export interface ImportJobStatus {
  job_id: string
  status: 'processing' | 'completed' | 'failed'
  total: number
  processed: number
  enriched: number
  ai_inferred: number
  failed: number
  created_at: string
  completed_at: string | null
}

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TRACK_NOT_FOUND = 'TRACK_NOT_FOUND',
  TRACK_DUPLICATE = 'TRACK_DUPLICATE',
  SPOTIFY_NOT_FOUND = 'SPOTIFY_NOT_FOUND',
  METADATA_FAILED = 'METADATA_FAILED',
  XML_PARSE_ERROR = 'XML_PARSE_ERROR',
  XML_INVALID_FORMAT = 'XML_INVALID_FORMAT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiError {
  code: ErrorCode | string
  message: string
  details?: unknown
}
