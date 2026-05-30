import { useEffect, useState } from 'react'
import { Search, LayoutGrid, List, ArrowUpDown, Check } from 'lucide-react'
import { Dropdown, MenuItem } from '@/components/ui/Dropdown'
import { Kbd } from '@/components/ui/Kbd'
import { cx } from '@/lib/format'
import { useFilterStore } from '@/stores/filters'
import { useUIStore } from '@/stores/ui'
import type { TrackFilters } from '@serendipia/types'

type SortBy = NonNullable<TrackFilters['sort_by']>
type SortOrder = NonNullable<TrackFilters['sort_order']>

const SORTS: { label: string; by: SortBy; order: SortOrder }[] = [
  { label: 'Más recientes', by: 'created_at', order: 'desc' },
  { label: 'BPM ↑', by: 'bpm', order: 'asc' },
  { label: 'BPM ↓', by: 'bpm', order: 'desc' },
  { label: 'Energía ↓', by: 'energy', order: 'desc' },
  { label: 'Año ↓', by: 'year', order: 'desc' },
  { label: 'Título A-Z', by: 'title', order: 'asc' },
]

export function LibraryToolbar({ total }: { total: number }) {
  const { search, setSearch, sortBy, sortOrder, setSort } = useFilterStore()
  const { libraryView, setLibraryView } = useUIStore()
  const [local, setLocal] = useState(search)

  // debounce de búsqueda (300ms, como pide el design)
  useEffect(() => {
    const id = setTimeout(() => setSearch(local), 300)
    return () => clearTimeout(id)
  }, [local, setSearch])

  useEffect(() => { setLocal(search) }, [search])

  const currentSort = SORTS.find((s) => s.by === sortBy && s.order === sortOrder) ?? SORTS[0]

  return (
    <div className="flex flex-col gap-3">
      {/* Búsqueda global */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" />
        <input
          aria-label="Buscar tracks"
          placeholder="Buscar tracks…"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface-raised pl-9 pr-16 text-sm text-fg placeholder:text-fg-faint transition-colors focus:border-primary focus:outline-none focus:shadow-[0_0_0_3px] focus:shadow-primary/15"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <Kbd>⌘K</Kbd>
        </span>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
          <ViewToggle active={libraryView === 'grid'} onClick={() => setLibraryView('grid')} label="Grid">
            <LayoutGrid size={15} />
          </ViewToggle>
          <ViewToggle active={libraryView === 'list'} onClick={() => setLibraryView('list')} label="Lista">
            <List size={15} />
          </ViewToggle>
        </div>

        <span className="text-[13px] text-fg-soft">
          <span className="font-mono tabular-nums text-fg">{total.toLocaleString('es')}</span> tracks
        </span>

        <div className="ml-auto">
          <Dropdown
            align="right"
            ariaLabel="Ordenar"
            trigger={() => (
              <span className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] text-fg-soft hover:text-fg transition-colors">
                <ArrowUpDown size={14} /> {currentSort.label}
              </span>
            )}
          >
            {(close) => (
              <>
                {SORTS.map((s) => (
                  <MenuItem key={s.label} onClick={() => { setSort(s.by, s.order); close() }}>
                    <Check size={13} className={cx(s === currentSort ? 'opacity-100 text-primary-light' : 'opacity-0')} />
                    {s.label}
                  </MenuItem>
                ))}
              </>
            )}
          </Dropdown>
        </div>
      </div>
    </div>
  )
}

function ViewToggle({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Vista ${label}`}
      aria-pressed={active}
      className={cx(
        'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors cursor-pointer',
        active ? 'bg-surface-raised text-fg' : 'text-fg-faint hover:text-fg-soft',
      )}
    >
      {children}
    </button>
  )
}
