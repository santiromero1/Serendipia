import type { Library, Track } from './types'

/**
 * Lectura del XML de rekordbox en el navegador. El archivo no sale de la compu:
 * se parsea acá y se guarda en IndexedDB.
 *
 * Mismas reglas que el escáner local (scripts/scan-library.mjs), para que los ids coincidan
 * y se pueda sumar el análisis de audio cuando existe.
 */

const MAJOR: Record<string, string> = { C: '8B', G: '9B', D: '10B', A: '11B', E: '12B', B: '1B', 'F#': '2B', Gb: '2B', Db: '3B', 'C#': '3B', Ab: '4B', 'G#': '4B', Eb: '5B', 'D#': '5B', Bb: '6B', 'A#': '6B', F: '7B' }
const MINOR: Record<string, string> = { A: '8A', E: '9A', B: '10A', 'F#': '11A', Gb: '11A', 'C#': '12A', Db: '12A', 'G#': '1A', Ab: '1A', 'D#': '2A', Eb: '2A', Bb: '3A', 'A#': '3A', F: '4A', C: '5A', G: '6A', D: '7A' }

export function toCamelot(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  const cam = s.match(/^(\d{1,2})\s*([ABab])$/)
  if (cam) {
    const n = Number(cam[1])
    return n >= 1 && n <= 12 ? `${n}${cam[2].toUpperCase()}` : null
  }
  const m = s.match(/^([A-Ga-g])([#b♯♭]?)\s*(m|min|minor|maj|major)?$/i)
  if (!m) return null
  const note = m[1].toUpperCase() + m[2].replace('♯', '#').replace('♭', 'b')
  const minor = /^m(in|inor)?$/i.test(m[3] ?? '')
  return (minor ? MINOR : MAJOR)[note] ?? null
}

function parseCrate(folder: string | undefined) {
  if (!folder) return null
  const m = folder.match(/^(\d+)\s*-\s*(.+)$/)
  const name = (m ? m[2] : folder).trim()
  return { order: m ? Number(m[1]) : null, name, code: name.replace(/\s*\(.*\)\s*$/, '') }
}

function commentTags(comment: string | null): string[] {
  if (!comment) return []
  return comment
    .split(' / ')
    .map((s) => s.trim())
    .filter((s) => /^Transitions\b/.test(s) || /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ]{2,19}$/.test(s))
}

function mixedInKey(comment: string | null) {
  const m = comment?.match(/\b(\d{1,2}[AB])\s*-\s*(?:Energy\s*)?(\d{1,2})\b/)
  return m ? { key: toCamelot(m[1]), energy: Number(m[2]) } : null
}

/** "Artista - Título (Mix) [Sello]" */
function parseFilename(base: string) {
  let label: string | null = null
  const lm = base.match(/\s*\[([^\]]+)\]\s*$/)
  if (lm) {
    label = lm[1].trim()
    base = base.slice(0, lm.index).trim()
  }
  const i = base.indexOf(' - ')
  return i < 0 ? { artist: null, title: base, label } : { artist: base.slice(0, i).trim(), title: base.slice(i + 3).trim(), label }
}

export async function trackId(rel: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(rel.normalize('NFC')))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
}

function locationToPath(location: string): string | null {
  try {
    return decodeURIComponent(location.replace(/^file:\/\/localhost/, '').replace(/^file:\/\//, '')).normalize('NFC')
  } catch {
    return null
  }
}

/** Carpeta raíz de la biblioteca: la más profunda que contiene al menos el 80% de los temas. */
function detectRoot(paths: string[]): string {
  const counts = new Map<string, number>()
  for (const p of paths) {
    const parts = p.split('/').slice(0, -1)
    for (let i = 2; i <= parts.length; i++) {
      const dir = parts.slice(0, i).join('/')
      counts.set(dir, (counts.get(dir) ?? 0) + 1)
    }
  }
  let root = '/'
  let depth = 0
  for (const [dir, n] of counts) {
    const d = dir.split('/').length
    if (n >= paths.length * 0.8 && d > depth) {
      root = dir
      depth = d
    }
  }
  return root
}

export interface ImportResult {
  lib: Library
  skipped: number
}

export async function parseRekordboxXml(text: string): Promise<ImportResult> {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror') || !doc.querySelector('DJ_PLAYLISTS')) {
    throw new Error('El archivo no es un XML de rekordbox. Exportalo desde Archivo > Exportar colección en formato xml.')
  }

  const raw = [...doc.querySelectorAll('COLLECTION > TRACK')]
    .map((el) => ({ el, path: locationToPath(el.getAttribute('Location') ?? '') }))
    .filter((r): r is { el: Element; path: string } => !!r.path)
  // muestras del sampler y archivos muy cortos no son temas
  const songs = raw.filter((r) => Number(r.el.getAttribute('TotalTime') ?? 0) >= 45)
  const root = detectRoot(songs.map((s) => s.path))

  const byTrackId = new Map<string, string>()
  const byPath = new Map<string, string>()
  const tracks: Track[] = []

  for (const { el, path } of songs) {
    const a = (k: string) => el.getAttribute(k) || null
    const inside = path.startsWith(root + '/')
    const rel = inside ? path.slice(root.length + 1) : path
    const parts = rel.split('/')
    const file = parts[parts.length - 1]
    const fn = parseFilename(file.replace(/\.[^.]+$/, ''))
    const crate = inside && parts.length > 2 ? parseCrate(parts[1]) : null
    const comment = a('Comments')
    const mik = mixedInKey(comment)
    const rating = Number(a('Rating') ?? 0)
    const stars = rating ? Math.round(rating / 51) || null : null
    const bpm = Number(a('AverageBpm') ?? 0)
    const key = toCamelot(a('Tonality')) ?? mik?.key ?? null
    const id = await trackId(rel)
    const added = Date.parse(a('DateAdded') ?? '') || 0

    byTrackId.set(a('TrackID') ?? '', id)
    byPath.set(path, id)
    tracks.push({
      id,
      rel,
      title: a('Name') ?? fn.title,
      artist: a('Artist') ?? fn.artist ?? 'Unknown',
      label: a('Label') ?? fn.label,
      genre: inside ? (parts.length > 1 ? parts[0] : 'Sin carpeta') : 'Otras carpetas',
      crate: crate?.code ?? null,
      crateName: crate?.name ?? null,
      crateOrder: crate?.order ?? null,
      tagGenre: a('Genre'),
      year: Number(a('Year')) || null,
      bpm: bpm > 0 ? Math.round(bpm * 10) / 10 : null,
      bpmSource: bpm > 0 ? 'rekordbox' : null,
      key,
      keySource: key ? 'rekordbox' : null,
      stars,
      mikEnergy: mik?.energy ?? null,
      tags: commentTags(comment),
      duration: Number(a('TotalTime')) || null,
      format: file.split('.').pop()?.toLowerCase() ?? '',
      cover: false,
      added,
      energy: stars ? stars * 2 : null,
      energySource: stars ? 'estrellas' : null,
      dance: null,
      bright: null,
    })
  }

  // playlists: árbol de NODE; Type="0" carpeta, Type="1" playlist
  const playlists: Library['playlists'] = []
  const walk = (node: Element, trail: string[]) => {
    for (const child of [...node.children].filter((c) => c.tagName === 'NODE')) {
      const name = child.getAttribute('Name') ?? ''
      if (child.getAttribute('Type') === '1') {
        const byLocation = child.getAttribute('KeyType') === '1'
        const ids = [...child.children]
          .filter((c) => c.tagName === 'TRACK')
          .map((t) => {
            const k = t.getAttribute('Key') ?? ''
            return byLocation ? byPath.get(locationToPath(k) ?? '') : byTrackId.get(k)
          })
          .filter((x): x is string => !!x)
        if (ids.length) playlists.push({ name: [...trail, name].join(' / '), tracks: ids })
      } else walk(child, [...trail, name])
    }
  }
  const rootNode = doc.querySelector('PLAYLISTS > NODE')
  if (rootNode) walk(rootNode, [])

  return {
    lib: {
      generatedAt: new Date().toISOString(),
      root,
      rekordbox: true,
      audioAnalysis: false,
      tracks,
      playlists,
    },
    skipped: raw.length - songs.length,
  }
}

/**
 * Suma a la biblioteca del XML lo que solo da el análisis de audio local
 * (energía estimada, bailabilidad, brillo, posición en el mapa, tapas), por id.
 */
export function mergeAnalysis(base: Library, analysis: Library): Library {
  const byId = new Map(analysis.tracks.map((t) => [t.id, t]))
  let hits = 0
  const tracks = base.tracks.map((t) => {
    const a = byId.get(t.id)
    if (!a) return t
    hits++
    return {
      ...t,
      energy: t.stars ? t.energy : a.energy,
      energySource: t.stars ? t.energySource : a.energy != null ? ('audio' as const) : null,
      dance: a.dance,
      bright: a.bright,
      x: a.x,
      y: a.y,
      cover: a.cover,
      bpm: t.bpm ?? a.bpm,
      bpmSource: t.bpm ? t.bpmSource : a.bpmSource,
    }
  })
  return { ...base, tracks, audioAnalysis: hits > 0 }
}
