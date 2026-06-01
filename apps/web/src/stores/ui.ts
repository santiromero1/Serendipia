import { create } from 'zustand'

export type LibraryView = 'grid' | 'list'
export type PanelType = 'none' | 'add' | 'detail'

export const MIN_SIDEBAR_WIDTH = 200
export const MAX_SIDEBAR_WIDTH = 420
export const DEFAULT_SIDEBAR_WIDTH = 240

const SIDEBAR_WIDTH_KEY = 'serendipia.sidebarWidth'

function loadSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (!raw) return DEFAULT_SIDEBAR_WIDTH
    const n = Number(raw)
    if (Number.isFinite(n) && n >= MIN_SIDEBAR_WIDTH && n <= MAX_SIDEBAR_WIDTH) return n
  } catch {
    /* ignore */
  }
  return DEFAULT_SIDEBAR_WIDTH
}

interface UIState {
  libraryView: LibraryView
  panel: { type: PanelType; trackId?: string }
  importOpen: boolean
  newPlaylistOpen: boolean
  searchOpen: boolean
  sidebarCollapsed: boolean
  sidebarWidth: number

  setLibraryView: (v: LibraryView) => void
  openAddTrack: () => void
  openTrackDetail: (trackId: string) => void
  closePanel: () => void
  setImportOpen: (v: boolean) => void
  setNewPlaylistOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  libraryView: 'grid',
  panel: { type: 'none' },
  importOpen: false,
  newPlaylistOpen: false,
  searchOpen: false,
  sidebarCollapsed: false,
  sidebarWidth: loadSidebarWidth(),

  setLibraryView: (v) => set({ libraryView: v }),
  openAddTrack: () => set({ panel: { type: 'add' } }),
  openTrackDetail: (trackId) => set({ panel: { type: 'detail', trackId } }),
  closePanel: () => set({ panel: { type: 'none' } }),
  setImportOpen: (v) => set({ importOpen: v }),
  setNewPlaylistOpen: (v) => set({ newPlaylistOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarWidth: (width) => {
    const sidebarWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width))
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth))
    } catch {
      /* ignore */
    }
    set({ sidebarWidth })
  },
}))
