import { create } from 'zustand'

export type LibraryView = 'grid' | 'list'
export type PanelType = 'none' | 'add' | 'detail'

interface UIState {
  libraryView: LibraryView
  panel: { type: PanelType; trackId?: string }
  importOpen: boolean
  newPlaylistOpen: boolean
  searchOpen: boolean
  sidebarCollapsed: boolean

  setLibraryView: (v: LibraryView) => void
  openAddTrack: () => void
  openTrackDetail: (trackId: string) => void
  closePanel: () => void
  setImportOpen: (v: boolean) => void
  setNewPlaylistOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  libraryView: 'grid',
  panel: { type: 'none' },
  importOpen: false,
  newPlaylistOpen: false,
  searchOpen: false,
  sidebarCollapsed: false,

  setLibraryView: (v) => set({ libraryView: v }),
  openAddTrack: () => set({ panel: { type: 'add' } }),
  openTrackDetail: (trackId) => set({ panel: { type: 'detail', trackId } }),
  closePanel: () => set({ panel: { type: 'none' } }),
  setImportOpen: (v) => set({ importOpen: v }),
  setNewPlaylistOpen: (v) => set({ newPlaylistOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
