import { create } from 'zustand'

interface UIState {
  /** tema abierto en el panel de detalle */
  selectedId: string | null
  filtersOpen: boolean
  select: (id: string | null) => void
  toggleFilters: () => void
}

export const useUI = create<UIState>((set) => ({
  selectedId: null,
  filtersOpen: true,
  select: (selectedId) => set({ selectedId }),
  toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
}))
