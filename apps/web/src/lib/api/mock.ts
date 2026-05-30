import type {
  Track,
  TrackTag,
  TrackSummary,
  Playlist,
  PlaylistWithTracks,
  ExportFormat,
  TrackFilters,
  CreateTrackInput,
  UpdateTrackInput,
  ImportJobStatus,
  ApiList,
} from '@serendipia/types'
import type { ApiClient, MetadataPreview } from './client'
import { buildMockTracks, buildMockPlaylists } from '@/lib/mock/data'
import { CAMELOT_KEYS, CAMELOT_TO_STANDARD } from '@/lib/camelot'

// ── Store en memoria ──────────────────────────────────────────
const tracks: Track[] = buildMockTracks()
const playlists: Playlist[] = buildMockPlaylists()
const playlistTracks = new Map<string, string[]>([
  ['pl-0001', tracks.filter((t) => t.tags.some((x) => ['peak', 'explotarla'].includes(x.tag))).slice(0, 6).map((t) => t.id)],
  ['pl-0002', tracks.filter((t) => t.tags.some((x) => ['apertura', 'calentar'].includes(x.tag))).slice(0, 5).map((t) => t.id)],
  ['pl-0003', tracks.filter((t) => t.tags.some((x) => ['cierre', 'emotional'].includes(x.tag))).slice(0, 4).map((t) => t.id)],
])
const importJobs = new Map<string, ImportJobStatus & { startedAt: number }>()

playlists.forEach((p) => { p.track_count = playlistTracks.get(p.id)?.length ?? 0 })

let idCounter = 9000
const newId = (p: string) => `${p}-${++idCounter}`
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms))
const nowIso = () => new Date().toISOString()

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function toSummary(t: Track): TrackSummary {
  return {
    id: t.id, title: t.title, artist: t.artist, bpm: t.bpm,
    key_camelot: t.key_camelot, energy: t.energy, metadata_status: t.metadata_status,
    tags: t.tags.map((x) => ({ tag: x.tag, tag_type: x.tag_type })),
  }
}

// ── Filtros y orden (honra 5-api.md §3) ───────────────────────
function applyFilters(list: Track[], f: TrackFilters): Track[] {
  let out = list
  if (f.search) {
    const q = f.search.toLowerCase()
    out = out.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
  }
  if (f.bpm_min != null) out = out.filter((t) => t.bpm != null && t.bpm >= f.bpm_min!)
  if (f.bpm_max != null) out = out.filter((t) => t.bpm != null && t.bpm <= f.bpm_max!)
  if (f.energy_min != null) out = out.filter((t) => t.energy != null && t.energy >= f.energy_min!)
  if (f.energy_max != null) out = out.filter((t) => t.energy != null && t.energy <= f.energy_max!)
  if (f.year_min != null) out = out.filter((t) => t.year != null && t.year >= f.year_min!)
  if (f.year_max != null) out = out.filter((t) => t.year != null && t.year <= f.year_max!)
  if (f.status) out = out.filter((t) => t.metadata_status === f.status)
  if (f.key_camelot?.length) out = out.filter((t) => t.key_camelot != null && f.key_camelot!.includes(t.key_camelot))
  if (f.genre?.length) out = out.filter((t) => t.genre.some((g) => f.genre!.includes(g)))
  if (f.tags?.length) out = out.filter((t) => t.tags.some((x) => f.tags!.includes(x.tag)))

  const sortBy = f.sort_by ?? 'created_at'
  const dir = f.sort_order === 'asc' ? 1 : -1
  out = [...out].sort((a, b) => {
    const av = sortField(a, sortBy)
    const bv = sortField(b, sortBy)
    if (av == null && bv == null) return 0
    if (av == null) return 1 // nulls al final
    if (bv == null) return -1
    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    return 0
  })
  return out
}

function sortField(t: Track, key: NonNullable<TrackFilters['sort_by']>): number | string | null {
  switch (key) {
    case 'bpm': return t.bpm
    case 'energy': return t.energy
    case 'year': return t.year
    case 'title': return t.title.toLowerCase()
    default: return t.created_at
  }
}

// ── Enriquecimiento simulado ──────────────────────────────────
function fakeEnrich(title: string, artist: string): MetadataPreview {
  const h = hash(`${artist}::${title}`)
  const underground = /edit|bootleg|rework|unknown|untitled/i.test(`${title} ${artist}`)
  const bpm = 120 + (h % 21) // 120-140
  const key = CAMELOT_KEYS[h % CAMELOT_KEYS.length]
  const energy = Math.round((0.45 + ((h >> 3) % 50) / 100) * 100) / 100 // 0.45-0.95
  const dance = Math.round((0.55 + ((h >> 5) % 40) / 100) * 100) / 100
  const year = underground ? null : 1990 + (h % 35)
  const tags: string[] = []
  if (energy >= 0.85) tags.push('peak', 'explotarla')
  else if (energy >= 0.65) tags.push('peak')
  else if (energy >= 0.5) tags.push('calentar')
  else tags.push('cierre', 'emotional')
  if (underground) tags.push('underground')
  return {
    bpm, key_camelot: key, key_standard: CAMELOT_TO_STANDARD[key] ?? null,
    energy, danceability: dance, year,
    genre: underground ? ['techno'] : ['house'],
    metadata_status: underground ? 'ai_inferred' : 'enriched',
    metadata_source: underground ? 'ai' : 'getsongbpm',
    tags: [...new Set(tags)].slice(0, 4),
  }
}

// ── Implementación ────────────────────────────────────────────
export const mockClient: ApiClient = {
  async listTracks(filters) {
    await delay()
    const filtered = applyFilters(tracks, filters)
    const limit = filters.limit ?? 200
    const offset = filters.offset ?? 0
    const page = filtered.slice(offset, offset + limit)
    const result: ApiList<Track> = {
      data: page,
      meta: { total: filtered.length, limit, offset, has_more: offset + limit < filtered.length },
    }
    return result
  },

  async getTrack(id) {
    await delay(120)
    const t = tracks.find((x) => x.id === id)
    if (!t) throw new Error('TRACK_NOT_FOUND')
    return t
  },

  async previewMetadata(title, artist) {
    await delay(900) // simula latencia de Spotify + GetSongBPM
    return fakeEnrich(title, artist)
  },

  async createTrack(input: CreateTrackInput) {
    await delay(400)
    const dup = tracks.some(
      (t) => t.title.toLowerCase() === input.title.toLowerCase() &&
        t.artist.toLowerCase() === input.artist.toLowerCase(),
    )
    if (dup) throw new Error('TRACK_DUPLICATE')
    const meta = fakeEnrich(input.title, input.artist)
    const track: Track = {
      id: newId('trk'), user_id: 'mock-user',
      title: input.title, artist: input.artist,
      bpm: meta.bpm, key_camelot: meta.key_camelot, key_standard: meta.key_standard,
      energy: meta.energy, danceability: meta.danceability, valence: 0.5,
      year: meta.year, genre: meta.genre, duration_ms: 200000,
      spotify_id: meta.metadata_source === 'ai' ? null : `spotify_${idCounter}`,
      metadata_status: meta.metadata_status, metadata_source: meta.metadata_source,
      notes: input.notes ?? null,
      tags: meta.tags.map((tag) => ({ id: newId('tag'), tag, tag_type: 'moment', source: 'ai' })),
      created_at: nowIso(), updated_at: nowIso(),
    }
    tracks.unshift(track)
    return track
  },

  async updateTrack(id, input: UpdateTrackInput) {
    await delay(180)
    const t = tracks.find((x) => x.id === id)
    if (!t) throw new Error('TRACK_NOT_FOUND')
    Object.assign(t, input)
    if (input.title != null || input.artist != null || input.bpm !== undefined || input.key_camelot !== undefined) {
      t.metadata_status = 'manual'
      t.metadata_source = 'manual'
    }
    t.updated_at = nowIso()
    return t
  },

  async deleteTrack(id) {
    await delay(150)
    const i = tracks.findIndex((x) => x.id === id)
    if (i >= 0) tracks.splice(i, 1)
    playlistTracks.forEach((ids, pid) => {
      const next = ids.filter((x) => x !== id)
      playlistTracks.set(pid, next)
      const pl = playlists.find((p) => p.id === pid)
      if (pl) pl.track_count = next.length
    })
  },

  async addTag(trackId, tag) {
    await delay(120)
    const t = tracks.find((x) => x.id === trackId)
    if (!t) throw new Error('TRACK_NOT_FOUND')
    const newTag: TrackTag = { id: newId('tag'), tag, tag_type: 'custom', source: 'user' }
    t.tags.push(newTag)
    return newTag
  },

  async removeTag(trackId, tagId) {
    await delay(120)
    const t = tracks.find((x) => x.id === trackId)
    if (t) t.tags = t.tags.filter((x) => x.id !== tagId)
  },

  async importXml(fileName) {
    await delay(300)
    const count = 60 + (hash(fileName) % 40) // 60-99 tracks "detectados"
    const job: ImportJobStatus & { startedAt: number } = {
      job_id: newId('job'), status: 'processing', total: count,
      processed: 0, enriched: 0, ai_inferred: 0, failed: 0,
      created_at: nowIso(), completed_at: null, startedAt: Date.now(),
    }
    importJobs.set(job.job_id, job)
    // Agrega tracks nuevos generados al store (aparecen al terminar el job)
    for (let i = 0; i < count; i++) {
      const meta = fakeEnrich(`Imported ${i}-${job.job_id}`, 'Rekordbox')
      tracks.push({
        id: newId('trk'), user_id: 'mock-user',
        title: `Track Importado ${i + 1}`, artist: `Artista ${1 + (i % 12)}`,
        bpm: meta.bpm, key_camelot: meta.key_camelot, key_standard: meta.key_standard,
        energy: meta.energy, danceability: meta.danceability, valence: 0.5,
        year: 1995 + (i % 30), genre: meta.genre, duration_ms: 210000,
        spotify_id: null, metadata_status: meta.metadata_status, metadata_source: 'rekordbox',
        notes: null, tags: meta.tags.slice(0, 2).map((tag) => ({ id: newId('tag'), tag, tag_type: 'moment', source: 'ai' })),
        created_at: nowIso(), updated_at: nowIso(),
      })
    }
    return stripStart(job)
  },

  async getImportJob(jobId) {
    await delay(80)
    const job = importJobs.get(jobId)
    if (!job) throw new Error('JOB_NOT_FOUND')
    // Avanza el progreso según el tiempo transcurrido (~4.5s total)
    const elapsed = Date.now() - job.startedAt
    const ratio = Math.min(1, elapsed / 4500)
    job.processed = Math.round(job.total * ratio)
    job.enriched = Math.round(job.processed * 0.9)
    job.ai_inferred = job.processed - job.enriched
    if (ratio >= 1 && job.status === 'processing') {
      job.status = 'completed'
      job.completed_at = nowIso()
    }
    return stripStart(job)
  },

  async listPlaylists() {
    await delay(120)
    return playlists.map((p) => ({ ...p }))
  },

  async createPlaylist(name, description) {
    await delay(160)
    const pl: Playlist = {
      id: newId('pl'), user_id: 'mock-user', name,
      description: description ?? null, track_count: 0,
      created_at: nowIso(), updated_at: nowIso(),
    }
    playlists.push(pl)
    playlistTracks.set(pl.id, [])
    return pl
  },

  async getPlaylist(id) {
    await delay(140)
    const pl = playlists.find((p) => p.id === id)
    if (!pl) throw new Error('PLAYLIST_NOT_FOUND')
    const ids = playlistTracks.get(id) ?? []
    const items = ids
      .map((tid, idx) => {
        const t = tracks.find((x) => x.id === tid)
        return t ? { ...toSummary(t), position: idx + 1 } : null
      })
      .filter((x): x is TrackSummary & { position: number } => x !== null)
    const result: PlaylistWithTracks = { ...pl, tracks: items }
    return result
  },

  async updatePlaylist(id, input) {
    await delay(140)
    const pl = playlists.find((p) => p.id === id)
    if (!pl) throw new Error('PLAYLIST_NOT_FOUND')
    if (input.name != null) pl.name = input.name
    if (input.description !== undefined) pl.description = input.description
    pl.updated_at = nowIso()
    return { ...pl }
  },

  async deletePlaylist(id) {
    await delay(140)
    const i = playlists.findIndex((p) => p.id === id)
    if (i >= 0) playlists.splice(i, 1)
    playlistTracks.delete(id)
  },

  async addTrackToPlaylist(playlistId, trackId) {
    await delay(120)
    const ids = playlistTracks.get(playlistId)
    if (!ids) throw new Error('PLAYLIST_NOT_FOUND')
    if (ids.includes(trackId)) throw new Error('TRACK_IN_PLAYLIST')
    ids.push(trackId)
    const pl = playlists.find((p) => p.id === playlistId)
    if (pl) pl.track_count = ids.length
  },

  async removeTrackFromPlaylist(playlistId, trackId) {
    await delay(120)
    const ids = playlistTracks.get(playlistId)
    if (!ids) return
    const next = ids.filter((x) => x !== trackId)
    playlistTracks.set(playlistId, next)
    const pl = playlists.find((p) => p.id === playlistId)
    if (pl) pl.track_count = next.length
  },

  async reorderPlaylist(playlistId, trackIds) {
    await delay(120)
    playlistTracks.set(playlistId, trackIds)
    return this.getPlaylist(playlistId)
  },

  async exportPlaylist(id, format: ExportFormat) {
    await delay(200)
    const pl = await this.getPlaylist(id)
    const date = new Date().toISOString().slice(0, 10)
    const safe = pl.name.replace(/[^a-z0-9]+/gi, '_')
    const filename = `${safe}_${date}.${format}`
    const content = format === 'm3u' ? buildM3U(pl) : buildRekordboxXML(pl)
    return { filename, content }
  },

  async libraryStats() {
    await delay(80)
    return {
      total: tracks.length,
      enriched: tracks.filter((t) => t.metadata_status === 'enriched').length,
      pending: tracks.filter((t) => t.metadata_status === 'pending').length,
      playlists: playlists.length,
    }
  },
}

function stripStart(job: ImportJobStatus & { startedAt: number }): ImportJobStatus {
  const { startedAt, ...rest } = job
  void startedAt
  return rest
}

function buildM3U(pl: PlaylistWithTracks): string {
  const lines = ['#EXTM3U', `# Serendipia · ${pl.name}`]
  for (const t of pl.tracks) {
    lines.push(`#EXTINF:-1,${t.artist} - ${t.title}`)
    lines.push(`${t.artist} - ${t.title}.mp3`)
  }
  return lines.join('\n')
}

function buildRekordboxXML(pl: PlaylistWithTracks): string {
  const trackNodes = pl.tracks
    .map(
      (t, i) =>
        `    <TRACK TrackID="${i + 1}" Name="${esc(t.title)}" Artist="${esc(t.artist)}" Tonality="${t.key_camelot ?? ''}" Tempo="${t.bpm ?? ''}"/>`,
    )
    .join('\n')
  const refs = pl.tracks.map((_, i) => `      <TRACK Key="${i + 1}"/>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="Serendipia" Version="0.1.0" Company="Serendipia"/>
  <COLLECTION Entries="${pl.tracks.length}">
${trackNodes}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="1" Name="${esc(pl.name)}" Entries="${pl.tracks.length}">
${refs}
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
