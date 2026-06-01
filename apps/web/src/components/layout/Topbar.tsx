import { NavLink } from 'react-router-dom'
import { Plus, Search, Disc3, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Kbd'
import { cx } from '@/lib/format'
import { useUIStore } from '@/stores/ui'

export function Topbar() {
  const openAdd = useUIStore((s) => s.openAddTrack)
  const openSearch = useUIStore((s) => s.setSearchOpen)
  const openImport = useUIStore((s) => s.setImportOpen)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/85 backdrop-blur-md px-5">
      <NavLink to="/" className="flex items-center gap-2 text-fg font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 text-primary-light">
          <Disc3 size={16} />
        </span>
        Serendipia
      </NavLink>

      <nav className="flex items-center gap-1">
        <NavItem to="/">Biblioteca</NavItem>
        <NavItem to="/graph">Grafo</NavItem>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => openSearch(true)}
          className="hidden md:flex h-9 w-72 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 text-[13px] text-fg-faint hover:border-border-strong hover:text-fg-soft transition-colors cursor-pointer"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Buscar tracks…</span>
          <Kbd>⌘K</Kbd>
        </button>
        <Button variant="secondary" onClick={() => openImport(true)} size="md" aria-label="Importar archivos">
          <Upload size={15} /> Importar
        </Button>
        <Button onClick={openAdd} size="md">
          <Plus size={16} /> Track
        </Button>
      </div>
    </header>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'rounded-md px-3 h-9 inline-flex items-center text-[13px] transition-colors',
          isActive ? 'bg-surface-raised text-fg' : 'text-fg-soft hover:bg-surface-raised hover:text-fg',
        )
      }
    >
      {children}
    </NavLink>
  )
}
