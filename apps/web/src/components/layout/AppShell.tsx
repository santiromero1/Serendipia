import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Topbar } from './Topbar'
import { SidebarResizeHandle } from './SidebarResizeHandle'
import { LibrarySidebar } from '@/components/library/LibrarySidebar'
import { AddTrackPanel } from '@/components/track/AddTrackPanel'
import { TrackDetailPanel } from '@/components/track/TrackDetailPanel'
import { ImportModal } from '@/components/import/ImportModal'
import { NewPlaylistModal } from '@/components/playlist/NewPlaylistModal'
import { SearchPalette } from '@/components/search/SearchPalette'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useSidebarResize } from '@/hooks/useSidebarResize'
import { useUIStore } from '@/stores/ui'
import { useFilterStore } from '@/stores/filters'
import { cx } from '@/lib/format'

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const activeFilters = useFilterStore((s) => s.activeCount())
  const { isResizing, onResizeStart } = useSidebarResize()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-fg-soft">
      <Topbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          style={{ width: collapsed ? 0 : sidebarWidth }}
          className={cx(
            'relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-surface/40',
            !isResizing && 'transition-[width] duration-200 ease-out',
            collapsed && 'border-r-0',
          )}
        >
          <LibrarySidebar />
          {!collapsed && <SidebarResizeHandle isResizing={isResizing} onPointerDown={onResizeStart} />}
        </aside>
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-6 py-6">
          {collapsed && (
            <button
              onClick={toggleSidebar}
              aria-label="Abrir panel de filtros"
              className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-lg border border-border bg-surface/90 px-3 py-1.5 text-[12px] text-fg-soft shadow-md backdrop-blur transition-colors hover:border-border-strong hover:text-fg cursor-pointer animate-fade-in"
            >
              <SlidersHorizontal size={14} /> Filtros
              {activeFilters > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/25 px-1 text-[10px] font-semibold text-primary-light tabular-nums">{activeFilters}</span>
              )}
            </button>
          )}
          {children}
        </main>
      </div>

      {/* Paneles y modales globales */}
      <AddTrackPanel />
      <TrackDetailPanel />
      <ImportModal />
      <NewPlaylistModal />
      <SearchPalette />
    </div>
  )
}
