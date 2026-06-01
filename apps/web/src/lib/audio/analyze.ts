import { parseBlob } from 'music-metadata'
import { analyze as analyzeBpm } from 'web-audio-beat-detector'
import { CAMELOT_KEYS, CAMELOT_TO_STANDARD } from '@/lib/camelot'

/** Resultado del análisis completo de un archivo de audio. */
export interface AnalyzedFile {
  title: string
  artist: string
  album: string | null
  year: number | null
  genre: string[]
  bpm: number | null
  key_camelot: string | null
  key_standard: string | null
  duration_ms: number | null
  format: string | null
  bitrate: number | null
  cover_blob: Blob | null
  audio_buffer: AudioBuffer
  metadata_source: 'rekordbox' | 'audio_analysis' | 'manual'
}

/** Inversión de Camelot → standard para parsear notación estándar a Camelot. */
const STANDARD_TO_CAMELOT: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [cam, std] of Object.entries(CAMELOT_TO_STANDARD)) {
    out[std.toLowerCase()] = cam
  }
  // Aliases comunes
  out['a#m'] = '3A'; out['bbm'] = '3A'
  out['c#m'] = '12A'; out['dbm'] = '12A'
  out['d#m'] = '2A'; out['ebm'] = '2A'
  out['f#m'] = '11A'; out['gbm'] = '11A'
  out['g#m'] = '1A'; out['abm'] = '1A'
  out['c#'] = '3B'; out['db'] = '3B'
  out['d#'] = '10B'; out['eb'] = '5B'
  out['f#'] = '2B'; out['gb'] = '2B'
  out['g#'] = '4B'; out['ab'] = '4B'
  out['a#'] = '6B'; out['bb'] = '6B'
  return out
})()

/** Acepta "8A", "Am", "A min", "C# major", etc. Devuelve clave Camelot o null. */
export function parseKey(input: string | undefined | null): string | null {
  if (!input) return null
  const cleaned = input.trim()

  // Ya es Camelot
  if (CAMELOT_KEYS.includes(cleaned.toUpperCase())) {
    return cleaned.toUpperCase()
  }

  // Notación estándar — intentamos varios formatos
  const normalized = cleaned
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/maj(or)?$/, '')
    .replace(/min(or)?$/, 'm')
  return STANDARD_TO_CAMELOT[normalized] ?? null
}

/**
 * Analiza un archivo de audio: ID3 → si faltan BPM/clave, intenta detección DSP.
 * Lanza con mensaje claro si el archivo no se puede decodificar.
 */
export async function analyzeAudioFile(file: File, audioContext: AudioContext): Promise<AnalyzedFile> {
  // 1. ID3 / metadatos del archivo
  const metadata = await parseBlob(file)
  const c = metadata.common
  const f = metadata.format

  // 2. Cover embebida (si la hay)
  let cover_blob: Blob | null = null
  const pic = c.picture?.[0]
  if (pic) {
    cover_blob = new Blob([new Uint8Array(pic.data)], { type: pic.format })
  }

  // 3. Decodificar audio (necesario para waveform + BPM si falta en tag)
  const buffer = await file.arrayBuffer()
  const audio_buffer = await audioContext.decodeAudioData(buffer.slice(0))

  // 4. BPM: priorizar tag, fallback a DSP
  let bpm: number | null = c.bpm ? Math.round(c.bpm) : null
  let source: AnalyzedFile['metadata_source'] = bpm ? 'rekordbox' : 'manual'
  if (!bpm) {
    try {
      const detected = await analyzeBpm(audio_buffer)
      bpm = Math.round(detected)
      source = 'audio_analysis'
    } catch {
      // detección falló (track muy corta, sin transientes claros, etc.) — queda null
    }
  }

  // 5. Clave: solo desde tag por ahora (detección DSP requiere essentia.js)
  const key_camelot = parseKey(c.key as string | undefined)
  const key_standard = key_camelot ? CAMELOT_TO_STANDARD[key_camelot] ?? null : null

  // Título/artista con fallback al filename si tag vacío
  const fileBaseName = file.name.replace(/\.[^.]+$/, '')
  const title = c.title?.trim() || fileBaseName
  const artist = c.artist?.trim() || 'Unknown'

  return {
    title,
    artist,
    album: c.album?.trim() ?? null,
    year: c.year ?? null,
    genre: c.genre ?? [],
    bpm,
    key_camelot,
    key_standard,
    duration_ms: f.duration ? Math.round(f.duration * 1000) : null,
    format: f.container?.toLowerCase() ?? null,
    bitrate: f.bitrate ? Math.round(f.bitrate / 1000) : null, // kbps
    cover_blob,
    audio_buffer,
    metadata_source: source,
  }
}
