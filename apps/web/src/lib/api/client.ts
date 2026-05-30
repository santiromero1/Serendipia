import type {
  Track,
  TrackTag,
  Playlist,
  PlaylistWithTracks,
  ExportFormat,
  TrackFilters,
  CreateTrackInput,
  UpdateTrackInput,
  ImportJobStatus,
  ApiList,
} from '@serendipia/types'

/** Metadatos propuestos antes de guardar (preview de "Buscar metadatos"). */
export interface MetadataPreview {
  bpm: number | null
  key_camelot: string | null
  key_standard: string | null
  energy: number | null
  danceability: number | null
  year: number | null
  genre: string[]
  metadata_status: Track['metadata_status']
  metadata_source: Track['metadata_source']
  tags: string[]
}

/**
 * Contrato de la API de Serendipia. Hoy lo implementa el mock client;
 * mañana lo implementará un fetch client contra el backend real (5-api.md).
 * Cambiar de uno a otro es reemplazar el export en `index.ts`.
 */
export interface ApiClient {
  // Tracks
  listTracks(filters: TrackFilters): Promise<ApiList<Track>>
  getTrack(id: string): Promise<Track>
  previewMetadata(title: string, artist: string): Promise<MetadataPreview>
  createTrack(input: CreateTrackInput): Promise<Track>
  updateTrack(id: string, input: UpdateTrackInput): Promise<Track>
  deleteTrack(id: string): Promise<void>
  addTag(trackId: string, tag: string): Promise<TrackTag>
  removeTag(trackId: string, tagId: string): Promise<void>

  // Import
  importXml(fileName: string): Promise<ImportJobStatus>
  getImportJob(jobId: string): Promise<ImportJobStatus>

  // Playlists
  listPlaylists(): Promise<Playlist[]>
  createPlaylist(name: string, description?: string): Promise<Playlist>
  getPlaylist(id: string): Promise<PlaylistWithTracks>
  updatePlaylist(id: string, input: { name?: string; description?: string }): Promise<Playlist>
  deletePlaylist(id: string): Promise<void>
  addTrackToPlaylist(playlistId: string, trackId: string): Promise<void>
  removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void>
  reorderPlaylist(playlistId: string, trackIds: string[]): Promise<PlaylistWithTracks>
  exportPlaylist(id: string, format: ExportFormat): Promise<{ filename: string; content: string }>

  // Stats (auth/me)
  libraryStats(): Promise<{ total: number; enriched: number; pending: number; playlists: number }>
}
