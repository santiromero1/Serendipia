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
  /** posición en el mapa de cercanía, 0 a 1 */
  x?: number
  y?: number
}

export interface Library {
  generatedAt: string
  root: string
  rekordbox: boolean
  audioAnalysis: boolean
  tracks: Track[]
  playlists: { name: string; tracks: string[] }[]
}

export type Feature = 'energy' | 'dance' | 'bright'

export const FEATURE_LABEL: Record<Feature, string> = {
  energy: 'Energía',
  dance: 'Bailabilidad',
  bright: 'Brillo',
}
