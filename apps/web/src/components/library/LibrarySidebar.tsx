import { NavLink } from 'react-router-dom'
import { Plus, ListMusic, RotateCcw } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { RangeSlider } from '@/components/ui/RangeSlider'
import { CAMELOT_KEYS } from '@/lib/camelot'
import { cx } from '@/lib/format'
import { DJ_MOMENT_TAGS } from '@serendipia/types'
import { useFilterStore, BPM_RANGE } from '@/stores/filters'
import { usePlaylists } from '@/hooks/usePlaylists'
import { useUIStore } from '@/stores/ui'

const GENRES = [
  'techno', 'house', 'tech house', 'deep house', 'progressive house',
  'trance', 'eurodance', 'drum and bass', 'big beat', 'acid techno', 'french house',
]

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-faint">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export function LibrarySidebar() {
  const f = useFilterStore()
  const active = f.activeCount()
  const { data: playlists } = usePlaylists()
  const openNewPlaylist = useUIStore((s) => s.setNewPlaylistOpen)

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {/* Filtros */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">Filtros</h2>
        {active > 0 && (
          <button
            onClick={f.reset}
            className="flex items-center gap-1 text-[11px] text-fg-faint hover:text-primary-light transition-colors cursor-pointer"
          >
            <RotateCcw size={11} /> Limpiar ({active})
          </button>
        )}
      </div>

      <Section title="BPM">
        <RangeSlider
          min={BPM_RANGE.min}
          max={BPM_RANGE.max}
          valueMin={f.bpmMin}
          valueMax={f.bpmMax}
          onChange={f.setBpm}
        />
      </Section>

      <Section title="Clave (Camelot)">
        <div className="grid grid-cols-4 gap-1">
          {CAMELOT_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => f.toggleKey(k)}
              aria-pressed={f.keys.includes(k)}
              className={cx(
                'h-7 rounded-md border text-[11px] font-mono transition-colors cursor-pointer',
                f.keys.includes(k)
                  ? 'border-primary bg-primary/25 text-white'
                  : 'border-border bg-surface text-fg-soft hover:border-border-strong hover:text-fg',
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Energía">
        <RangeSlider
          min={0}
          max={1}
          step={0.01}
          valueMin={f.energyMin}
          valueMax={f.energyMax}
          onChange={f.setEnergy}
          format={(v) => v.toFixed(2)}
        />
      </Section>

      <Section title="Momento">
        <div className="flex flex-wrap gap-1.5">
          {DJ_MOMENT_TAGS.map((t) => (
            <Chip key={t} tone="moment" active={f.tags.includes(t)} onClick={() => f.toggleTag(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Género">
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((g) => (
            <Chip key={g} tone="genre" active={f.genres.includes(g)} onClick={() => f.toggleGenre(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </Section>

      <div className="h-px bg-border" />

      {/* Playlists */}
      <Section
        title="Playlists"
        action={
          <button
            onClick={() => openNewPlaylist(true)}
            aria-label="Nueva playlist"
            className="text-fg-faint hover:text-primary-light transition-colors cursor-pointer"
          >
            <Plus size={14} />
          </button>
        }
      >
        <nav className="space-y-0.5">
          {(playlists ?? []).map((p) => (
            <NavLink
              key={p.id}
              to={`/playlist/${p.id}`}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                  isActive ? 'bg-surface-raised text-fg' : 'text-fg-soft hover:bg-surface-raised hover:text-fg',
                )
              }
            >
              <ListMusic size={14} className="shrink-0 text-fg-faint" />
              <span className="truncate flex-1">{p.name}</span>
              <span className="font-mono text-[11px] text-fg-faint tabular-nums">{p.track_count}</span>
            </NavLink>
          ))}
          {(playlists ?? []).length === 0 && (
            <p className="px-2 py-1 text-[12px] text-fg-faint">Sin playlists todavía</p>
          )}
        </nav>
      </Section>
    </div>
  )
}
