import type { Track } from '@serendipia/types'

/**
 * Clusters de género para el grafo de colección.
 *
 * Las anclas 2D siguen afinidad musical, no distribución uniforme:
 *   · Eje X: groove underground (izq) → épico/melódico (der)
 *   · Eje Y: lento/groovy 4/4 (abajo) → rápido/agresivo o broken (arriba)
 *
 * Familias cercanas: House ↔ Deep House ↔ Tech House ↔ Techno
 *                     House ↔ Progressive ↔ Trance
 * Hard queda arriba-derecha (150+ BPM, agresivo), lejos del groove progresivo.
 * DnB arriba-centro (broken beat), aislado del 4/4.
 */
export interface Cluster {
  id: string
  label: string
  x: number
  y: number
  color: string
}

/** Géneros mostrados como chips en el panel de filtros. */
export const FILTER_GENRES = [
  'techno',
  'melodic techno',
  'tech house',
  'house',
  'deep house',
  'progressive house',
  'trance',
  'hardstyle',
  'hard techno',
  'drum and bass',
  'minimal techno',
  'acid techno',
  'electro house',
  'french house',
] as const

export const CLUSTERS: Cluster[] = [
  // Familia house/techno (4/4 groovy, abajo-izquierda)
  { id: 'techno',      label: 'Techno',      x: -520, y:  -40, color: '#7C3AED' },
  { id: 'tech-house',  label: 'Tech House',  x: -180, y:  120, color: '#8B5CF6' },
  { id: 'house',       label: 'House',       x:    0, y:  380, color: '#06B6D4' },
  { id: 'deep-house',  label: 'Deep House',  x: -220, y:  320, color: '#0EA5E9' },
  // Puente house → trance (centro-derecha)
  { id: 'progressive', label: 'Progressive', x:  180, y:  180, color: '#F59E0B' },
  { id: 'trance',      label: 'Trance',      x:  480, y:  -80, color: '#FB923C' },
  // Rápido/agresivo 4/4 — arriba-derecha, cerca de trance en BPM pero lejos de progressive
  { id: 'hard',        label: 'Hard',        x:  620, y: -420, color: '#EF4444' },
  // Broken beat — arriba-centro, aislado
  { id: 'dnb',         label: 'DnB',         x:   60, y: -580, color: '#10B981' },
  { id: 'other',       label: '',            x: -680, y:  520, color: '#64748B' },
]

const GENRE_TO_CLUSTER: Record<string, string> = {
  // Techno
  techno: 'techno',
  'acid techno': 'techno',
  'minimal techno': 'techno',
  'detroit techno': 'techno',
  'industrial techno': 'techno',
  'melodic techno': 'techno',
  'peak time techno': 'techno',
  'raw techno': 'techno',
  'hypnotic techno': 'techno',
  'hard techno': 'techno',
  // Tech House
  'tech house': 'tech-house',
  microhouse: 'tech-house',
  // House
  house: 'house',
  'electro house': 'house',
  'french house': 'house',
  'chicago house': 'house',
  'funky house': 'house',
  'latin house': 'house',
  'afro house': 'house',
  garage: 'house',
  disco: 'house',
  // Deep House
  'deep house': 'deep-house',
  'soulful house': 'deep-house',
  // Progressive
  'progressive house': 'progressive',
  'progressive trance': 'progressive',
  'prog house': 'progressive',
  'prog trance': 'progressive',
  // Trance
  trance: 'trance',
  'dream trance': 'trance',
  psytrance: 'trance',
  'uplifting trance': 'trance',
  'vocal trance': 'trance',
  eurodance: 'trance',
  // Hard
  hardstyle: 'hard',
  hardcore: 'hard',
  gabber: 'hard',
  rawstyle: 'hard',
  'hard trance': 'hard',
  // DnB / breaks
  'drum and bass': 'dnb',
  dnb: 'dnb',
  jungle: 'dnb',
  breakbeat: 'dnb',
  'liquid dnb': 'dnb',
  neurofunk: 'dnb',
  'big beat': 'dnb',
  'future bass': 'dnb',
  // Otros → ancla "other" (sin label en el fondo)
  idm: 'other',
  electro: 'other',
  acid: 'other',
  synthpop: 'other',
  melodic: 'other',
  ambient: 'other',
  dance: 'other',
  pop: 'other',
}

const FALLBACK = CLUSTERS.find((c) => c.id === 'other')!

export function trackCluster(track: Track): Cluster {
  for (const g of track.genre) {
    const key = g.toLowerCase()
    const id = GENRE_TO_CLUSTER[key]
    if (id) return CLUSTERS.find((c) => c.id === id) ?? FALLBACK
  }
  return FALLBACK
}

/** Clusters con label visible en el grafo (excluye fallback "other"). */
export function visibleClusters(): Cluster[] {
  return CLUSTERS.filter((c) => c.label)
}
