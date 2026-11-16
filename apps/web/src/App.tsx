import { useEffect } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { CircleHelp, Inbox, LayoutList, Lightbulb, Rows3, ScatterChart, SlidersHorizontal } from 'lucide-react'
import { cx } from '@/components/bits'
import { DetailPanel } from '@/components/DetailPanel'
import { FiltersPanel } from '@/components/FiltersPanel'
import { Welcome } from '@/components/ImportXml'
import { PlayerBar } from '@/components/PlayerBar'
import { AdvicePage } from '@/pages/AdvicePage'
import { GuidePage } from '@/pages/GuidePage'
import { InboxPage } from '@/pages/InboxPage'
import { Tour } from '@/components/Tour'
import { LibraryPage } from '@/pages/LibraryPage'
import { MapPage } from '@/pages/MapPage'
import { SetsPage } from '@/pages/SetsPage'
import { activeFilterCount, useFilters } from '@/stores/filters'
import { useLibrary } from '@/stores/library'
import { usePlayer } from '@/stores/player'
import { undoSets } from '@/stores/sets'
import { useUI } from '@/stores/ui'

const NAV = [
  { to: '/bandeja', label: 'Bandeja de descargas', icon: Inbox, local: true },
  { to: '/', label: 'Biblioteca', icon: LayoutList },
  { to: '/mapa', label: 'Mapa', icon: ScatterChart },
  { to: '/sets', label: 'Sets', icon: Rows3 },
  { to: '/consejos', label: 'Consejos', icon: Lightbulb },
]

function Rail() {
  const filtersOpen = useUI((s) => s.filtersOpen)
  const toggleFilters = useUI((s) => s.toggleFilters)
  const count = useFilters(activeFilterCount)
  const canPlay = useLibrary((s) => s.canPlay)
  return (
    <nav className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-line py-3" aria-label="Secciones">
      <div className="mb-3 grid h-7 w-7 place-items-center rounded-full border border-line-strong text-[11px] font-semibold text-fg" aria-hidden>
        S
      </div>
      {NAV.filter((n) => canPlay || !('local' in n)).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          title={label}
          aria-label={label}
          className={({ isActive }) =>
            cx('grid h-9 w-9 place-items-center rounded-[6px] transition-colors', isActive ? 'bg-raised text-fg' : 'text-faint hover:text-soft')
          }
        >
          <Icon size={17} strokeWidth={1.6} />
        </NavLink>
      ))}
      <NavLink
        to="/guia"
        title="Cómo se usa"
        aria-label="Cómo se usa"
        className={({ isActive }) => cx('mt-auto grid h-9 w-9 place-items-center rounded-[6px] transition-colors', isActive ? 'bg-raised text-fg' : 'text-faint hover:text-soft')}
      >
        <CircleHelp size={17} strokeWidth={1.6} />
      </NavLink>
      <button
        title="Filtros"
        aria-label="Mostrar u ocultar filtros"
        aria-pressed={filtersOpen}
        onClick={toggleFilters}
        className={cx('relative grid h-9 w-9 place-items-center rounded-[6px] transition-colors', filtersOpen ? 'text-fg' : 'text-faint hover:text-soft')}
      >
        <SlidersHorizontal size={16} strokeWidth={1.6} />
        {count > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-signal" />}
      </button>
    </nav>
  )
}

export default function App() {
  const status = useLibrary((s) => s.status)
  const load = useLibrary((s) => s.load)
  const filtersOpen = useUI((s) => s.filtersOpen)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable) return
      if (e.code === 'Space') {
        e.preventDefault()
        usePlayer.getState().toggle()
      }
      if (e.key === 'Escape') useUI.getState().select(null)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoSets()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (status === 'loading') return <div className="grid h-screen place-items-center text-[12px] text-faint">Cargando biblioteca</div>
  if (status === 'empty') return <Welcome />

  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1">
          <Rail />
          {filtersOpen && <FiltersPanel />}
          <main className="flex min-w-0 flex-1">
            <Routes>
              <Route path="/" element={<LibraryPage />} />
              <Route path="/mapa" element={<MapPage />} />
              <Route path="/sets" element={<SetsPage />} />
              <Route path="/consejos" element={<AdvicePage />} />
              <Route path="/bandeja" element={<InboxPage />} />
              <Route path="/guia" element={<GuidePage />} />
              <Route path="*" element={<LibraryPage />} />
            </Routes>
          </main>
          <DetailPanel />
        </div>
        <PlayerBar />
        <Tour />
      </div>
    </BrowserRouter>
  )
}
