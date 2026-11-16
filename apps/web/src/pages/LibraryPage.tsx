import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import type { Track } from '@/lib/types'
import { AnalyzeMusic } from '@/components/AnalyzeMusic'
import { XmlDrop } from '@/components/ImportXml'
import { TourButton } from '@/components/Tour'
import { Cover, cx, fmtDuration, fmtLong, KeyChip, Meter, PlayButton } from '@/components/bits'
import { matchesFilters, useFilters } from '@/stores/filters'
import { useLibrary } from '@/stores/library'
import { usePlayer } from '@/stores/player'
import { useSets } from '@/stores/sets'
import { useUI } from '@/stores/ui'

type SortKey = 'title' | 'bpm' | 'key' | 'energy' | 'dance' | 'bright' | 'genre' | 'duration' | 'added'

const COLS: { key: SortKey; label: string; className: string }[] = [
  { key: 'title', label: 'Tema', className: 'min-w-0 flex-1' },
  { key: 'bpm', label: 'BPM', className: 'w-12 text-right' },
  { key: 'key', label: 'Ton.', className: 'w-11' },
  { key: 'energy', label: 'Energía', className: 'w-[68px]' },
  { key: 'dance', label: 'Baile', className: 'w-[68px]' },
  { key: 'bright', label: 'Brillo', className: 'w-[68px]' },
  { key: 'genre', label: 'Carpeta', className: 'w-[190px]' },
  { key: 'duration', label: 'Dur.', className: 'w-12 text-right' },
]

function sortValue(t: Track, k: SortKey): string | number | null {
  if (k === 'title') return `${t.artist} ${t.title}`.toLowerCase()
  if (k === 'genre') return `${t.genre} ${String(t.crateOrder ?? 99).padStart(2, '0')}`
  if (k === 'key') return t.key ? Number(t.key.slice(0, -1)) * 2 + (t.key.endsWith('B') ? 1 : 0) : null
  return t[k]
}

export function LibraryPage() {
  const tracks = useLibrary((s) => s.tracks)
  const lib = useLibrary((s) => s.lib)
  const filters = useFilters()
  const selectedId = useUI((s) => s.selectedId)
  const select = useUI((s) => s.select)
  const play = usePlayer((s) => s.play)
  const playingId = usePlayer((s) => s.trackId)
  const addTrack = useSets((s) => s.addTrack)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'genre', dir: 1 })
  const scrollRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => {
    const list = tracks.filter((t) => matchesFilters(t, filters))
    return list.sort((a, b) => {
      const va = sortValue(a, sort.key)
      const vb = sortValue(b, sort.key)
      if (va == null) return vb == null ? 0 : 1
      if (vb == null) return -1
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
    })
  }, [tracks, filters, sort])

  const virt = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 44, overscan: 12 })
  const total = rows.reduce((s, t) => s + (t.duration ?? 0), 0)
  const noKey = tracks.filter((t) => !t.key).length

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-baseline gap-3 px-5 pt-3">
        <h1 className="text-[14px] font-medium text-fg">Biblioteca</h1>
        <span className="self-center"><TourButton screen="library" /></span>
        <span className="num text-[12px] text-faint">
          {rows.length}
          {rows.length !== tracks.length && ` de ${tracks.length}`} temas · {fmtLong(total)}
        </span>
        <span data-tour="library-actions" className="ml-auto flex items-center gap-3 self-center">
          {lib && !lib.rekordbox && noKey > 0 && <span className="text-[11.5px] text-faint">{noKey} temas sin tonalidad: cargá el XML de rekordbox.</span>}
          <AnalyzeMusic />
          <XmlDrop compact />
        </span>
      </header>

      <div data-tour="library-columns" className="flex h-8 shrink-0 items-center gap-3 border-b border-line px-5 pl-[68px]">
        {COLS.map((c) => (
          <button
            key={c.key}
            onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : 1 }))}
            className={cx('label flex items-center gap-1 hover:text-soft', c.className, c.className.includes('text-right') && 'justify-end')}
          >
            {c.label}
            {sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
          </button>
        ))}
        <span className="w-6" />
      </div>

      <div ref={scrollRef} data-tour="library-list" className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-[13px] text-faint">
            Ningún tema cumple los filtros.{' '}
            <button onClick={filters.reset} className="text-fg underline underline-offset-2">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
            {virt.getVirtualItems().map((v) => {
              const t = rows[v.index]
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/track', t.id)}
                  onClick={() => select(t.id)}
                  onDoubleClick={() => play(t.id)}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: v.size, transform: `translateY(${v.start}px)` }}
                  className={cx(
                    'group flex cursor-pointer items-center gap-3 px-5',
                    selectedId === t.id ? 'bg-raised' : 'hover:bg-surface',
                  )}
                >
                  <div className="relative">
                    <Cover track={t} size={32} />
                    <PlayButton
                      id={t.id}
                      size={22}
                      className={cx('absolute inset-0 m-auto', playingId === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cx('truncate text-[13px]', playingId === t.id ? 'text-signal' : 'text-fg')}>{t.title}</div>
                    <div className="truncate text-[11.5px] text-faint">
                      {t.artist}
                      {t.label && <span className="text-ghost"> · {t.label}</span>}
                    </div>
                  </div>
                  <span className="num w-12 text-right text-[12px] text-soft">{t.bpm ?? '–'}</span>
                  <span className="w-11">
                    <KeyChip k={t.key} />
                  </span>
                  <span className="w-[68px]">
                    <Meter value={t.energy} />
                  </span>
                  <span className="w-[68px]">
                    <Meter value={t.dance} />
                  </span>
                  <span className="w-[68px]">
                    <Meter value={t.bright} />
                  </span>
                  <span className="w-[190px] truncate text-[12px] text-soft">
                    {t.genre}
                    {t.crate && <span className="text-faint"> · {t.crate}</span>}
                    {t.tags.length > 0 && <span className="text-ghost"> · {t.tags.join(', ')}</span>}
                  </span>
                  <span className="num w-12 text-right text-[12px] text-faint">{fmtDuration(t.duration)}</span>
                  <button
                    aria-label="Agregar al capítulo activo"
                    title="Agregar al capítulo activo"
                    onClick={(e) => {
                      e.stopPropagation()
                      addTrack(t.id)
                    }}
                    className="grid h-6 w-6 place-items-center rounded-[4px] text-faint opacity-0 hover:bg-fg hover:text-bg group-hover:opacity-100"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
