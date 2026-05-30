import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { useTracks } from '@/hooks/useTracks'
import { EnergyDot } from '@/components/ui/EnergyBar'
import { Kbd } from '@/components/ui/Kbd'
import { cx } from '@/lib/format'
import { useUIStore } from '@/stores/ui'

export function SearchPalette() {
  const open = useUIStore((s) => s.searchOpen)
  const close = () => useUIStore.getState().setSearchOpen(false)
  const openDetail = useUIStore((s) => s.openTrackDetail)

  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => { if (!open) setQ('') }, [open])

  const { data } = useTracks(useMemo(() => ({ search: q, limit: 8 }), [q]))
  const items = data?.data ?? []

  useEffect(() => { setActive(0) }, [q])

  if (!open) return null

  const choose = (id: string) => { close(); openDetail(id) }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); choose(items[active].id) }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={close} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Búsqueda" className="relative w-full max-w-xl rounded-xl border border-border bg-surface shadow-card animate-scale-in">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={16} className="text-fg-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Buscar tracks por título o artista…"
            className="h-12 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-fg-faint">
              {q ? 'Sin resultados' : 'Empezá a escribir para buscar en tu biblioteca…'}
            </p>
          )}
          {items.map((t, i) => (
            <button
              key={t.id}
              onClick={() => choose(t.id)}
              onMouseEnter={() => setActive(i)}
              className={cx(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer',
                i === active ? 'bg-surface-raised' : 'hover:bg-surface-raised',
              )}
            >
              <EnergyDot energy={t.energy} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-fg">{t.title}</div>
                <div className="truncate text-[11px] text-fg-soft">{t.artist}</div>
              </div>
              <div className="font-mono text-[12px] text-fg-soft tabular-nums">
                {t.bpm ?? '—'} · {t.key_camelot ?? '—'}
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-fg-faint">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> abrir detalle</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
