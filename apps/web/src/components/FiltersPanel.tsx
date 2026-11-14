import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { keyColor } from '@/lib/harmony'
import { useLibrary } from '@/stores/library'
import { activeFilterCount, BPM_LIMITS, SCALE_LIMITS, useFilters, type Range } from '@/stores/filters'
import { cx } from './bits'

function CamelotWheel() {
  const keys = useFilters((s) => s.keys)
  const toggle = useFilters((s) => s.toggle)
  const R = 84
  const seg = (n: number, r0: number, r1: number) => {
    const a0 = ((n - 1) * 30 - 105) * (Math.PI / 180)
    const a1 = (n * 30 - 105) * (Math.PI / 180)
    const p = (r: number, a: number) => `${R + r * Math.cos(a)},${R + r * Math.sin(a)}`
    return `M${p(r0, a0)} L${p(r1, a0)} A${r1},${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 0 0 ${p(r0, a0)}Z`
  }
  return (
    <svg viewBox={`0 0 ${R * 2} ${R * 2}`} className="mx-auto block w-[168px]" role="group" aria-label="Tonalidades">
      {Array.from({ length: 12 }, (_, i) => i + 1).flatMap((n) =>
        (['B', 'A'] as const).map((letter) => {
          const k = `${n}${letter}`
          const on = keys.includes(k)
          const [r0, r1] = letter === 'B' ? [56, 82] : [30, 54]
          const mid = ((n - 0.5) * 30 - 105) * (Math.PI / 180)
          const rm = (r0 + r1) / 2
          return (
            <g key={k} onClick={() => toggle('keys', k)} className="cursor-pointer" role="checkbox" aria-checked={on} aria-label={k}>
              <path
                d={seg(n, r0, r1)}
                fill={keyColor(k)}
                fillOpacity={on ? 0.95 : keys.length ? 0.1 : 0.26}
                stroke="var(--color-bg)"
                strokeWidth={1.5}
                className="transition-[fill-opacity] duration-150"
              />
              <text
                x={R + rm * Math.cos(mid)}
                y={R + rm * Math.sin(mid) + 3}
                textAnchor="middle"
                fontSize={8.5}
                fontFamily="var(--font-mono)"
                fill={on ? 'var(--color-bg)' : 'var(--color-soft)'}
                className="pointer-events-none"
              >
                {k}
              </text>
            </g>
          )
        }),
      )}
    </svg>
  )
}

function RangeRow({ label, value, limits, step, onChange }: { label: string; value: Range; limits: Range; step: number; onChange: (v: Range) => void }) {
  const pct = (v: number) => ((v - limits[0]) / (limits[1] - limits[0])) * 100
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[12px] text-soft">{label}</span>
        <span className="num text-[11px] text-faint">
          {value[0]}–{value[1]}
        </span>
      </div>
      <div className="dual">
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-soft"
          style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }}
        />
        <input
          type="range"
          aria-label={`${label} mínimo`}
          min={limits[0]}
          max={limits[1]}
          step={step}
          value={value[0]}
          onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])}
        />
        <input
          type="range"
          aria-label={`${label} máximo`}
          min={limits[0]}
          max={limits[1]}
          step={step}
          value={value[1]}
          onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])}
        />
      </div>
    </div>
  )
}

function Pill({ on, children, onClick, count }: { on: boolean; children: string; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'inline-flex h-6 items-center gap-1 rounded-[4px] border px-1.5 text-[11.5px] transition-colors',
        on ? 'border-fg bg-fg text-bg' : 'border-line text-soft hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
      {count != null && <span className={cx('num text-[10px]', on ? 'text-bg/60' : 'text-ghost')}>{count}</span>}
    </button>
  )
}

export function FiltersPanel() {
  const f = useFilters()
  const tracks = useLibrary((s) => s.tracks)
  const count = activeFilterCount(f)

  const { genres, crates, tags } = useMemo(() => {
    const g = new Map<string, number>()
    const c = new Map<string, { genre: string; crate: string; order: number; n: number }>()
    const tg = new Map<string, number>()
    for (const t of tracks) {
      g.set(t.genre, (g.get(t.genre) ?? 0) + 1)
      if (t.crate) {
        const k = `${t.genre}/${t.crate}`
        const e = c.get(k) ?? { genre: t.genre, crate: t.crate, order: t.crateOrder ?? 99, n: 0 }
        e.n++
        c.set(k, e)
      }
      for (const x of t.tags) tg.set(x, (tg.get(x) ?? 0) + 1)
    }
    return {
      genres: [...g].sort((a, b) => b[1] - a[1]),
      crates: [...c].sort((a, b) => a[1].order - b[1].order),
      tags: [...tg].sort((a, b) => b[1] - a[1]),
    }
  }, [tracks])

  // los cajones se muestran solo para los géneros elegidos: cada género tiene los suyos
  const visibleCrates = crates.filter(([, c]) => f.genres.includes(c.genre))

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-line">
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <span className="text-[13px] font-medium text-fg">
          Filtros {count > 0 && <span className="num ml-1 text-[11px] text-signal">{count}</span>}
        </span>
        {count > 0 && (
          <button onClick={f.reset} className="text-[11.5px] text-faint hover:text-fg">
            Limpiar
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6">
        <label className="flex h-8 items-center gap-2 rounded-[5px] border border-line px-2 focus-within:border-line-strong">
          <Search size={13} className="text-faint" />
          <input
            value={f.search}
            onChange={(e) => f.setSearch(e.target.value)}
            placeholder="Artista, tema, sello"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-ghost"
          />
          {f.search && (
            <button aria-label="Borrar búsqueda" onClick={() => f.setSearch('')} className="text-faint hover:text-fg">
              <X size={12} />
            </button>
          )}
        </label>

        <section>
          <div className="label mb-2">Tonalidad</div>
          <CamelotWheel />
        </section>

        <section className="space-y-3.5">
          <RangeRow label="BPM" value={f.bpm} limits={BPM_LIMITS} step={1} onChange={(v) => f.setRange('bpm', v)} />
          <RangeRow label="Energía" value={f.energy} limits={SCALE_LIMITS} step={0.5} onChange={(v) => f.setRange('energy', v)} />
          <RangeRow label="Bailabilidad" value={f.dance} limits={SCALE_LIMITS} step={0.5} onChange={(v) => f.setRange('dance', v)} />
          <RangeRow label="Brillo (oscuro a brillante)" value={f.bright} limits={SCALE_LIMITS} step={0.5} onChange={(v) => f.setRange('bright', v)} />
        </section>

        <section>
          <div className="label mb-2">Género</div>
          <div className="flex flex-wrap gap-1">
            {genres.map(([g, n]) => (
              <Pill key={g} on={f.genres.includes(g)} onClick={() => f.toggle('genres', g)} count={n}>
                {g}
              </Pill>
            ))}
          </div>
        </section>

        {visibleCrates.length > 0 && (
          <section>
            <div className="label mb-2">Cajón</div>
            <div className="flex flex-wrap gap-1">
              {visibleCrates.map(([k, c]) => (
                <Pill key={k} on={f.crates.includes(k)} onClick={() => f.toggle('crates', k)} count={c.n}>
                  {f.genres.length > 1 ? `${c.genre.split(/[ -]/)[0]} · ${c.crate}` : c.crate}
                </Pill>
              ))}
            </div>
          </section>
        )}

        {tags.length > 0 && (
          <section>
            <div className="label mb-2">Etiquetas</div>
            <div className="flex flex-wrap gap-1">
              {tags.map(([t, n]) => (
                <Pill key={t} on={f.tags.includes(t)} onClick={() => f.toggle('tags', t)} count={n}>
                  {t}
                </Pill>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  )
}
