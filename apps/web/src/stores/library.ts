import { create } from 'zustand'
import { openDB } from 'idb'
import type { Feature, Library, Track } from '@/lib/types'
import { mergeAnalysis, parseRekordboxXml } from '@/lib/rekordbox'
import { computeLayout } from '@/lib/layout'

type Overrides = Record<string, Partial<Record<Feature, number>>>

const OVERRIDES_KEY = 'serendipia.overrides'

function readOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** La biblioteca importada vive en IndexedDB de este navegador; nunca se sube a ningún servidor. */
const db = () =>
  openDB('serendipia', 2, {
    upgrade(d) {
      if (!d.objectStoreNames.contains('library')) d.createObjectStore('library')
    },
  })
const saveLibrary = async (lib: Library | null) => {
  try {
    const d = await db()
    if (lib) await d.put('library', lib, 'current')
    else await d.delete('library', 'current')
  } catch {
    /* sin IndexedDB (modo privado): la biblioteca dura lo que dure la pestaña */
  }
}
const readLibrary = async (): Promise<Library | null> => {
  try {
    return ((await (await db()).get('library', 'current')) as Library | undefined) ?? null
  } catch {
    return null
  }
}

/** Biblioteca generada por el escáner local (npm run scan), si la app corre en la Mac. */
async function fetchLocal(): Promise<Library | null> {
  try {
    const res = await fetch('/data/library.json', { cache: 'no-store' })
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null
    return (await res.json()) as Library
  } catch {
    return null
  }
}

function merge(lib: Library, overrides: Overrides) {
  const tracks = lib.tracks.map((t) => (overrides[t.id] ? { ...t, ...overrides[t.id] } : t))
  return { tracks, byId: new Map(tracks.map((t) => [t.id, t])) }
}

const withLayout = (lib: Library): Library => (lib.tracks.some((t) => t.x == null) ? { ...lib, tracks: computeLayout(lib.tracks) } : lib)

interface LibraryState {
  status: 'loading' | 'ready' | 'empty'
  lib: Library | null
  /** el audio se puede escuchar solo cuando la app corre en la compu donde está la música */
  canPlay: boolean
  /** de dónde vino la biblioteca */
  source: 'local' | 'xml' | null
  /** temas con las correcciones manuales ya aplicadas */
  tracks: Track[]
  byId: Map<string, Track>
  peaks: Record<string, number[]>
  overrides: Overrides
  load: () => Promise<void>
  importXml: (file: File) => Promise<string>
  importAnalysis: (file: File) => Promise<string>
  forget: () => Promise<void>
  setFeature: (id: string, feature: Feature, value: number | null) => void
}

export const useLibrary = create<LibraryState>((set, get) => {
  const apply = (lib: Library, source: 'local' | 'xml', canPlay: boolean) =>
    set({ status: 'ready', lib, source, canPlay, ...merge(lib, get().overrides) })

  const loadPeaks = () =>
    fetch('/data/peaks.json')
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : {}))
      .then((peaks) => set({ peaks }))
      .catch(() => {})

  return {
    status: 'loading',
    lib: null,
    canPlay: false,
    source: null,
    tracks: [],
    byId: new Map(),
    peaks: {},
    overrides: readOverrides(),

    async load() {
      const [stored, local] = await Promise.all([readLibrary(), fetchLocal()])
      const canPlay = !!local
      if (stored) apply(local ? mergeAnalysis(stored, local) : stored, 'xml', canPlay)
      else if (local) apply(local, 'local', canPlay)
      else return set({ status: 'empty' })
      if (canPlay) loadPeaks()
    },

    async importXml(file) {
      const { lib, skipped } = await parseRekordboxXml(await file.text())
      if (!lib.tracks.length) throw new Error('El XML no tiene temas.')
      const local = await fetchLocal()
      const prev = get().lib
      // conserva el análisis de audio que ya hubiera (local o subido antes)
      const analysis = local ?? (prev?.audioAnalysis ? prev : null)
      const merged = withLayout(analysis ? mergeAnalysis(lib, analysis) : lib)
      await saveLibrary(merged)
      apply(merged, 'xml', !!local)
      if (local) loadPeaks()
      const withKey = merged.tracks.filter((t) => t.key).length
      return `${merged.tracks.length} temas, ${withKey} con tonalidad, ${merged.playlists.length} playlists${skipped ? ` (se ignoraron ${skipped} muestras cortas)` : ''}.`
    },

    async importAnalysis(file) {
      const analysis = JSON.parse(await file.text()) as Library
      if (!Array.isArray(analysis.tracks)) throw new Error('No es un archivo de análisis de Serendipia.')
      const base = get().lib
      if (!base) throw new Error('Primero cargá el XML de rekordbox.')
      const merged = mergeAnalysis(base, analysis)
      const hits = merged.tracks.filter((t) => t.dance != null).length
      await saveLibrary(merged)
      apply(merged, get().source ?? 'xml', get().canPlay)
      return `Análisis sumado a ${hits} de ${merged.tracks.length} temas.`
    },

    async forget() {
      await saveLibrary(null)
      set({ status: 'loading' })
      await get().load()
    },

    setFeature(id, feature, value) {
      const { lib, overrides } = get()
      if (!lib) return
      const next = { ...overrides, [id]: { ...overrides[id] } }
      if (value == null) delete next[id][feature]
      else next[id][feature] = value
      if (!Object.keys(next[id]).length) delete next[id]
      try {
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
      } catch {
        /* sin almacenamiento: la corrección dura la sesión */
      }
      set({ overrides: next, ...merge(lib, next) })
    },
  }
})
