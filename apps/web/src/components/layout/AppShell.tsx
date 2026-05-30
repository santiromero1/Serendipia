import type { ReactNode } from 'react'
import { Topbar } from './Topbar'
import { LibrarySidebar } from '@/components/library/LibrarySidebar'
import { AddTrackPanel } from '@/components/track/AddTrackPanel'
import { TrackDetailPanel } from '@/components/track/TrackDetailPanel'
import { ImportModal } from '@/components/import/ImportModal'
import { NewPlaylistModal } from '@/components/playlist/NewPlaylistModal'
import { SearchPalette } from '@/components/search/SearchPalette'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts()

  return (
    <div className="flex min-h-screen flex-col bg-background text-fg-soft">
      <Topbar />
      <div className="flex flex-1 min-h-0">
        <aside className="w-60 shrink-0 border-r border-border bg-surface/40">
          <LibrarySidebar />
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto px-6 py-6">
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
