import type {
  Track,
  TrackTag,
  MetadataStatus,
  MetadataSource,
  Playlist,
} from '@serendipia/types'
import { CAMELOT_TO_STANDARD } from '@/lib/camelot'

let seq = 0
const uid = (p: string) => `${p}-${(++seq).toString().padStart(4, '0')}`

interface Seed {
  title: string
  artist: string
  bpm: number | null
  key: string | null
  energy: number | null
  dance: number | null
  valence: number | null
  year: number | null
  genre: string[]
  tags: string[]
  status?: MetadataStatus
  source?: MetadataSource
}

const SEEDS: Seed[] = [
  { title: 'Kernkraft 400', artist: 'Zombie Nation', bpm: 138, key: '8A', energy: 0.91, dance: 0.78, valence: 0.62, year: 1999, genre: ['techno', 'dance'], tags: ['peak', 'explotarla'] },
  { title: 'Sandstorm', artist: 'Darude', bpm: 136, key: '3A', energy: 0.88, dance: 0.74, valence: 0.55, year: 1999, genre: ['eurodance', 'trance'], tags: ['explotarla', 'peak'] },
  { title: 'Strobe', artist: 'deadmau5', bpm: 128, key: '9B', energy: 0.64, dance: 0.55, valence: 0.38, year: 2009, genre: ['progressive house'], tags: ['emotional', 'cierre'] },
  { title: 'Spastik', artist: 'Plastikman', bpm: 130, key: '5A', energy: 0.72, dance: 0.81, valence: 0.3, year: 1993, genre: ['techno', 'acid'], tags: ['calentar', 'underground'] },
  { title: 'Da Funk', artist: 'Daft Punk', bpm: 110, key: '11A', energy: 0.7, dance: 0.86, valence: 0.66, year: 1995, genre: ['french house'], tags: ['comercial', 'calentar'] },
  { title: 'Music Sounds Better with You', artist: 'Stardust', bpm: 123, key: '7B', energy: 0.74, dance: 0.9, valence: 0.84, year: 1998, genre: ['french house', 'disco'], tags: ['comercial', 'peak'] },
  { title: 'Voodoo People (Pendulum Remix)', artist: 'The Prodigy', bpm: 174, key: '6A', energy: 0.97, dance: 0.6, valence: 0.42, year: 2005, genre: ['drum and bass'], tags: ['explotarla', 'peak'] },
  { title: 'Born Slippy .NUXX', artist: 'Underworld', bpm: 138, key: '11B', energy: 0.85, dance: 0.62, valence: 0.4, year: 1995, genre: ['techno', 'breakbeat'], tags: ['peak', 'madrugada'] },
  { title: 'Café del Mar', artist: 'Energy 52', bpm: 134, key: '4A', energy: 0.8, dance: 0.6, valence: 0.5, year: 1993, genre: ['trance'], tags: ['emotional', 'peak'] },
  { title: 'Children', artist: 'Robert Miles', bpm: 138, key: '8B', energy: 0.66, dance: 0.5, valence: 0.45, year: 1995, genre: ['dream trance'], tags: ['emotional', 'cierre'] },
  { title: 'Insomnia', artist: 'Faithless', bpm: 128, key: '1A', energy: 0.78, dance: 0.7, valence: 0.4, year: 1995, genre: ['trance', 'house'], tags: ['peak', 'comercial'] },
  { title: 'Around the World', artist: 'Daft Punk', bpm: 121, key: '2A', energy: 0.72, dance: 0.92, valence: 0.6, year: 1997, genre: ['french house'], tags: ['calentar', 'comercial'] },
  { title: 'One More Time', artist: 'Daft Punk', bpm: 123, key: '10B', energy: 0.82, dance: 0.88, valence: 0.9, year: 2000, genre: ['french house'], tags: ['peak', 'comercial'] },
  { title: 'Satisfaction', artist: 'Benny Benassi', bpm: 130, key: '6B', energy: 0.86, dance: 0.83, valence: 0.55, year: 2002, genre: ['electro house'], tags: ['explotarla', 'peak'] },
  { title: 'Adagio for Strings', artist: 'Tiësto', bpm: 138, key: '12A', energy: 0.83, dance: 0.55, valence: 0.35, year: 2004, genre: ['trance'], tags: ['emotional', 'peak'] },
  { title: 'Greece 2000', artist: 'Three Drives', bpm: 137, key: '9A', energy: 0.79, dance: 0.62, valence: 0.5, year: 1997, genre: ['trance'], tags: ['peak', 'emotional'] },
  { title: 'Silent Shout', artist: 'The Knife', bpm: 120, key: '4B', energy: 0.6, dance: 0.7, valence: 0.25, year: 2006, genre: ['synthpop', 'techno'], tags: ['underground', 'madrugada'] },
  { title: 'Windowlicker', artist: 'Aphex Twin', bpm: 105, key: '7A', energy: 0.55, dance: 0.65, valence: 0.3, year: 1999, genre: ['idm'], tags: ['underground'] },
  { title: 'Galvanize', artist: 'The Chemical Brothers', bpm: 105, key: '5B', energy: 0.8, dance: 0.75, valence: 0.6, year: 2004, genre: ['big beat'], tags: ['calentar', 'comercial'] },
  { title: 'Smack My Bitch Up', artist: 'The Prodigy', bpm: 140, key: '10A', energy: 0.95, dance: 0.58, valence: 0.35, year: 1997, genre: ['big beat', 'breakbeat'], tags: ['explotarla', 'peak'] },
  { title: 'Bad', artist: 'Wave Racer', bpm: 124, key: '8A', energy: 0.7, dance: 0.8, valence: 0.7, year: 2014, genre: ['future bass'], tags: ['calentar'] },
  { title: 'Opus', artist: 'Eric Prydz', bpm: 126, key: '9A', energy: 0.82, dance: 0.7, valence: 0.42, year: 2015, genre: ['progressive house'], tags: ['peak', 'explotarla'] },
  { title: 'Pjanoo', artist: 'Eric Prydz', bpm: 126, key: '8B', energy: 0.79, dance: 0.82, valence: 0.72, year: 2008, genre: ['progressive house'], tags: ['peak', 'comercial'] },
  { title: 'Resurrection', artist: 'PPK', bpm: 137, key: '11A', energy: 0.84, dance: 0.6, valence: 0.45, year: 2001, genre: ['trance'], tags: ['peak', 'emotional'] },
  { title: 'For an Angel', artist: 'Paul van Dyk', bpm: 134, key: '7B', energy: 0.8, dance: 0.62, valence: 0.58, year: 1998, genre: ['trance'], tags: ['peak', 'emotional'] },
  { title: 'Rej', artist: 'Âme', bpm: 122, key: '6A', energy: 0.62, dance: 0.74, valence: 0.4, year: 2005, genre: ['deep house'], tags: ['calentar', 'underground'] },
  { title: 'Gabriel', artist: 'Roy Davis Jr.', bpm: 124, key: '3B', energy: 0.6, dance: 0.78, valence: 0.65, year: 1996, genre: ['garage', 'house'], tags: ['calentar'] },
  { title: 'Your Love', artist: 'Frankie Knuckles', bpm: 120, key: '2B', energy: 0.55, dance: 0.76, valence: 0.6, year: 1987, genre: ['chicago house'], tags: ['apertura', 'calentar'] },
  { title: 'Strings of Life', artist: 'Derrick May', bpm: 122, key: '8A', energy: 0.68, dance: 0.72, valence: 0.7, year: 1987, genre: ['detroit techno'], tags: ['emotional', 'underground'] },
  { title: 'Phreak', artist: 'Adam Beyer', bpm: 132, key: '5A', energy: 0.88, dance: 0.8, valence: 0.3, year: 2018, genre: ['techno'], tags: ['peak', 'explotarla'] },
  { title: 'The Bells', artist: 'Jeff Mills', bpm: 135, key: '6A', energy: 0.9, dance: 0.82, valence: 0.28, year: 1997, genre: ['techno'], tags: ['peak', 'explotarla', 'underground'] },
  { title: 'Hey Boy Hey Girl', artist: 'The Chemical Brothers', bpm: 130, key: '4A', energy: 0.86, dance: 0.78, valence: 0.6, year: 1999, genre: ['big beat'], tags: ['peak', 'comercial'] },
  { title: 'Flat Beat', artist: 'Mr. Oizo', bpm: 100, key: '7A', energy: 0.62, dance: 0.84, valence: 0.4, year: 1999, genre: ['electro'], tags: ['calentar', 'comercial'] },
  { title: 'Encore une fois', artist: 'Sash!', bpm: 135, key: '12B', energy: 0.78, dance: 0.7, valence: 0.6, year: 1997, genre: ['eurodance'], tags: ['comercial', 'peak'] },
  { title: 'Better Off Alone', artist: 'Alice DeeJay', bpm: 137, key: '1B', energy: 0.8, dance: 0.74, valence: 0.66, year: 1998, genre: ['eurodance', 'trance'], tags: ['comercial', 'peak'] },
  { title: 'Blue (Da Ba Dee)', artist: 'Eiffel 65', bpm: 128, key: '10B', energy: 0.75, dance: 0.72, valence: 0.7, year: 1998, genre: ['eurodance'], tags: ['comercial'] },
  { title: 'Acperience 1', artist: 'Hardfloor', bpm: 132, key: '5A', energy: 0.83, dance: 0.8, valence: 0.3, year: 1992, genre: ['acid techno'], tags: ['underground', 'peak'] },
  { title: 'Higher State of Consciousness', artist: 'Josh Wink', bpm: 130, key: '6A', energy: 0.85, dance: 0.83, valence: 0.32, year: 1995, genre: ['acid techno'], tags: ['explotarla', 'peak'] },
  { title: 'Plastic Dreams', artist: 'Jaydee', bpm: 124, key: '9A', energy: 0.68, dance: 0.8, valence: 0.45, year: 1992, genre: ['house'], tags: ['calentar', 'underground'] },
  { title: 'Cola', artist: 'CamelPhat & Elderbrook', bpm: 122, key: '8A', energy: 0.66, dance: 0.78, valence: 0.4, year: 2017, genre: ['tech house'], tags: ['calentar', 'peak'] },
  // Underground / edits sin presencia clara en APIs (inferidos por IA)
  { title: 'Untitled Warehouse Edit', artist: 'Unknown', bpm: 134, key: '7A', energy: 0.87, dance: 0.8, valence: 0.3, year: null, genre: ['techno'], tags: ['underground', 'peak'], status: 'ai_inferred', source: 'ai' },
  { title: 'Bootleg Rework 2024', artist: 'VA', bpm: 128, key: '8B', energy: 0.72, dance: 0.76, valence: 0.5, year: 2024, genre: ['house'], tags: ['underground'], status: 'ai_inferred', source: 'ai' },
  // Editado a mano por el DJ
  { title: 'Mi Edit del Cierre', artist: 'DJ Local', bpm: 120, key: '9B', energy: 0.45, dance: 0.6, valence: 0.7, year: 2023, genre: ['melodic'], tags: ['cierre', 'emotional'], status: 'manual', source: 'manual' },
  // Recién agregado, todavía sin enriquecer
  { title: 'Track Nuevo Sin Procesar', artist: 'Test', bpm: null, key: null, energy: null, dance: null, valence: null, year: null, genre: [], tags: [], status: 'pending', source: 'manual' },
]

function buildTags(tags: string[]): TrackTag[] {
  return tags.map((tag) => ({
    id: uid('tag'),
    tag,
    tag_type: 'moment' as const,
    source: 'ai' as const,
  }))
}

const NOW = '2026-05-20T18:00:00Z'

export function buildMockTracks(): Track[] {
  seq = 0
  return SEEDS.map((s, i) => ({
    id: uid('trk'),
    user_id: 'mock-user',
    title: s.title,
    artist: s.artist,
    bpm: s.bpm,
    key_camelot: s.key,
    key_standard: s.key ? CAMELOT_TO_STANDARD[s.key] ?? null : null,
    energy: s.energy,
    danceability: s.dance,
    valence: s.valence,
    year: s.year,
    genre: s.genre,
    duration_ms: s.bpm ? 180000 + ((i * 37) % 180) * 1000 : null,
    spotify_id: s.source === 'ai' || s.source === 'manual' ? null : `spotify_${i}`,
    metadata_status: s.status ?? 'enriched',
    metadata_source: s.source ?? 'getsongbpm',
    notes: null,
    tags: buildTags(s.tags),
    created_at: NOW,
    updated_at: NOW,
  }))
}

export function buildMockPlaylists(): Playlist[] {
  return [
    {
      id: 'pl-0001', user_id: 'mock-user', name: 'Set Viernes Club',
      description: 'Sala grande, peak de la noche', track_count: 0,
      created_at: NOW, updated_at: NOW,
    },
    {
      id: 'pl-0002', user_id: 'mock-user', name: 'Warm Up Julio',
      description: 'Apertura tranquila', track_count: 0,
      created_at: NOW, updated_at: NOW,
    },
    {
      id: 'pl-0003', user_id: 'mock-user', name: 'Cierre Emocional',
      description: null, track_count: 0,
      created_at: NOW, updated_at: NOW,
    },
  ]
}
