export interface Track {
  id: string
  /** ruta relativa a la carpeta de música */
  rel: string
  title: string
  artist: string
  label: string | null
  /** carpeta raíz */
  genre: string
  /** cajón: subcarpeta "NN - CÓDIGO" */
  crate: string | null
  crateName: string | null
  crateOrder: number | null
  tagGenre: string | null
  year: number | null
  bpm: number | null
  bpmSource: 'rekordbox' | 'archivo' | 'estimado' | null
  /** Camelot, "7A" */
  key: string | null
  keySource: 'rekordbox' | 'archivo' | null
  /** estrellas de rekordbox (1 a 5) */
  stars: number | null
  mikEnergy: number | null
  tags: string[]
  duration: number | null
  format: string
  cover: boolean
  added: number
  /** 1 a 10, relativo a la biblioteca */
  energy: number | null
  energySource?: 'estrellas' | 'audio' | null
  dance: number | null
  bright: number | null
  /** posición en la galaxia, 0 a 1 (disco centrado en 0.5, 0.5) */
  x?: number
  y?: number
  /** grupo sonoro detectado (índice en Library.clusters) */
  cluster?: number | null
  /** estilo que el modelo de audio más reconoce en el tema */
  style?: string | null
  /** huella sonora comprimida: 48 componentes principales en int8, base64 */
  emb?: string
  /** vecinos mutuos más parecidos (ids), para dibujar la red */
  nn?: string[]
}

export interface Cluster {
  id: number
  label: string
  n: number
  x: number
  y: number
  styles: string[]
}

export interface GalaxyReport {
  temas: number
  grupos: number
  raros: number
  sinGrupo: number
  genero: { huella: number; conTags?: number; simple: number; azar: number }
  cajon: { huella: number; conTags?: number; simple: number; azar: number }
}

export interface Library {
  generatedAt: string
  root: string
  rekordbox: boolean
  audioAnalysis: boolean
  tracks: Track[]
  clusters?: Cluster[]
  galaxy?: GalaxyReport | null
  playlists: { name: string; tracks: string[] }[]
}

/** Lo que el DJ dice de un tema dentro de un set en particular. No es una propiedad del tema. */
export interface Mark {
  role?: 'open' | 'peak' | 'close'
  /** tiene que estar sí o sí: no se recorta */
  must?: boolean
  /** queda de reserva, al final */
  extra?: boolean
  /** id del tema con el que va pegado */
  with?: string
  note?: string
}
export type Marks = Record<string, Mark>

export type Feature = 'energy' | 'dance' | 'bright'

export const FEATURE_LABEL: Record<Feature, string> = {
  energy: 'Energía',
  dance: 'Bailabilidad',
  bright: 'Brillo',
}
