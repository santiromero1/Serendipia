import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowDownUp, ArrowUp, GripVertical, Plus, X } from 'lucide-react'
import type { Mark, Marks, Track } from '@/lib/types'
import { keyRule, type KeyRule } from '@/lib/harmony'
import { arrange, nextTracks, played, trimToMinutes } from '@/lib/similarity'
import { useLibrary } from '@/stores/library'
import { useActiveSet, useSets, type Chapter } from '@/stores/sets'
import { useUI } from '@/stores/ui'
import { Btn, Cover, cx, fmt1, fmtDuration, fmtLong, KeyChip, PlayButton, Segmented } from './bits'

/** Salto de BPM a partir del cual conviene avisar. */
const BPM_WARN = 6

type Step = { rule: KeyRule | null; unknown: boolean; clash: boolean; bpm: number | null }

/** Paso de un tema al siguiente según las reglas Camelot del usuario. */
export function step(from: Track, to: Track): Step {
  const rule = keyRule(from.key, to.key)
  const unknown = !from.key || !to.key
  const bpm = from.bpm != null && to.bpm != null ? Math.round((to.bpm - from.bpm) * 10) / 10 : null
  return { rule, unknown, clash: !rule && !unknown, bpm }
}

const keysOf = (a: Track, b: Track) => `${a.key ?? '?'} → ${b.key ?? '?'}`

function StepBadge({ s, compact, vs }: { s: Step; compact?: boolean; vs?: boolean }) {
  const bpmWarn = s.bpm != null && Math.abs(s.bpm) > BPM_WARN
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cx(
          'num inline-flex h-[18px] items-center rounded-[3px] px-1.5 text-[10.5px]',
          s.clash ? 'bg-warn/15 text-warn' : s.unknown ? 'text-ghost' : 'text-signal',
          vs && !s.clash && 'border border-line-strong',
        )}
        title={s.rule ? `Regla ${s.rule.rank}: ${s.rule.label}` : s.unknown ? 'Falta la tonalidad de uno de los dos' : 'Ninguna de tus reglas cubre este paso'}
      >
        {vs && <span className="mr-1 text-faint">↔</span>}
        {s.clash && <AlertTriangle size={10} className="mr-1" />}
        {s.rule ? s.rule.label : s.unknown ? 'sin tonalidad' : 'choca'}
      </span>
      {!compact && s.bpm != null && (
        <span className={cx('num text-[10.5px]', bpmWarn ? 'text-warn' : 'text-ghost')} title={bpmWarn ? `Salto de más de ${BPM_WARN} BPM` : undefined}>
          {s.bpm === 0 ? '= BPM' : `${s.bpm > 0 ? '+' : ''}${s.bpm} BPM`}
        </span>
      )}
    </span>
  )
}

/** Huecos del capítulo donde un tema encaja con el anterior y con el siguiente. */
function fits(t: Track, order: Track[]) {
  const rest = order.filter((x) => x.id !== t.id)
  const out: { index: number; prev?: Track; next?: Track; score: number; a?: KeyRule | null; b?: KeyRule | null }[] = []
  for (let i = 0; i <= rest.length; i++) {
    const prev = rest[i - 1]
    const next = rest[i]
    const a = prev ? keyRule(prev.key, t.key) : undefined
    const b = next ? keyRule(t.key, next.key) : undefined
    if ((prev && !a) || (next && !b)) continue
    const bpmPen = (prev?.bpm != null && t.bpm != null ? Math.abs(t.bpm - prev.bpm) : 0) + (next?.bpm != null && t.bpm != null ? Math.abs(next.bpm - t.bpm) : 0)
    out.push({ index: i, prev, next, a, b, score: (a?.score ?? 0.7) + (b?.score ?? 0.7) - bpmPen * 0.03 })
  }
  return out.sort((x, y) => y.score - x.score)
}

const ROLE_LABEL = { open: 'abre', peak: 'peak', close: 'cierra' } as const

/** Etiquetas chicas con lo que el DJ marcó para este tema en este set. */
function MarkBadges({ mark, byId }: { mark: Mark | undefined; byId: Map<string, Track> }) {
  if (!mark) return null
  const items = [mark.role && ROLE_LABEL[mark.role], mark.must && 'sí o sí', mark.extra && 'extra', mark.with && byId.get(mark.with) && `con ${byId.get(mark.with)!.title}`].filter(Boolean) as string[]
  if (!items.length && !mark.note) return null
  return (
    <span className="flex min-w-0 items-center gap-1">
      {items.map((x) => (
        <span key={x} className="max-w-[130px] shrink-0 truncate rounded-[3px] border border-line-strong px-1 text-[10px] leading-[15px] text-soft">
          {x}
        </span>
      ))}
      {mark.note && <span className="truncate text-[10.5px] italic text-faint">{mark.note}</span>}
    </span>
  )
}

function MarkEditor({ track, order, marks }: { track: Track; order: Track[]; marks: Marks }) {
  const setMarks = useSets((s) => s.setMarks)
  const mark = marks[track.id] ?? {}
  const Toggle = ({ on, label, onClick, title }: { on: boolean; label: string; onClick: () => void; title: string }) => (
    <button
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={cx('h-6 rounded-[4px] border px-2 text-[11.5px] transition-colors', on ? 'border-fg bg-fg text-bg' : 'border-line text-soft hover:border-line-strong hover:text-fg')}
    >
      {label}
    </button>
  )
  /** Abre y cierra son únicos por playlist: marcar uno desmarca al que lo tenía. */
  const setRole = (role: 'open' | 'peak' | 'close') => {
    const patch: Record<string, Partial<Mark>> = { [track.id]: { role: mark.role === role ? undefined : role, extra: undefined } }
    if (role !== 'peak') for (const t of order) if (t.id !== track.id && marks[t.id]?.role === role) patch[t.id] = { role: undefined }
    setMarks(patch)
  }
  return (
    <div className="shrink-0 space-y-2.5 border-b border-line p-4">
      <div className="label">En este set</div>
      <div className="flex flex-wrap gap-1">
        <Toggle on={mark.role === 'open'} label="Abre" title="Va primero en esta playlist" onClick={() => setRole('open')} />
        <Toggle on={mark.role === 'peak'} label="Peak" title="Va hacia el final, en lo más alto" onClick={() => setRole('peak')} />
        <Toggle on={mark.role === 'close'} label="Cierra" title="Va último en esta playlist" onClick={() => setRole('close')} />
        <Toggle on={!!mark.must} label="Sí o sí" title="No se recorta nunca" onClick={() => setMarks({ [track.id]: { must: !mark.must, extra: undefined } })} />
        <Toggle on={!!mark.extra} label="Extra" title="Queda de reserva al final" onClick={() => setMarks({ [track.id]: { extra: !mark.extra, must: undefined, role: undefined } })} />
      </div>
      <label className="flex items-center gap-2 text-[11.5px] text-faint">
        Va junto a
        <select
          value={mark.with ?? ''}
          onChange={(e) => setMarks({ [track.id]: { with: e.target.value || undefined } })}
          className="h-6 min-w-0 flex-1 rounded-[4px] border border-line bg-transparent px-1 text-[11.5px] text-fg outline-none"
        >
          <option value="" className="bg-surface">
            ninguno
          </option>
          {order
            .filter((t) => t.id !== track.id)
            .map((t) => (
              <option key={t.id} value={t.id} className="bg-surface">
                {t.title}
              </option>
            ))}
        </select>
      </label>
      <input
        value={mark.note ?? ''}
        onChange={(e) => setMarks({ [track.id]: { note: e.target.value } })}
        placeholder="Nota para este set"
        aria-label="Nota para este set"
        className="h-7 w-full rounded-[4px] border border-line bg-transparent px-2 text-[12px] text-fg outline-none placeholder:text-ghost focus:border-line-strong"
      />
    </div>
  )
}

function Inspector({ track, order, inSet, marks, onMove, onInsert }: { track: Track; order: Track[]; inSet: Set<string>; marks: Marks; onMove: (index: number) => void; onInsert: (id: string, index: number) => void }) {
  const library = useLibrary((s) => s.tracks)
  const select = useUI((s) => s.select)
  const [tab, setTab] = useState<'chapter' | 'library'>('chapter')
  const i = order.findIndex((t) => t.id === track.id)
  const prev = order[i - 1]
  const next = order[i + 1]

  const compat = useMemo(() => {
    const others = order.filter((t) => t.id !== track.id)
    const before = others.map((t) => ({ t, s: step(t, track) })).filter((x) => !x.s.clash).sort((a, b) => (b.s.rule?.score ?? 0) - (a.s.rule?.score ?? 0))
    const after = others.map((t) => ({ t, s: step(track, t) })).filter((x) => !x.s.clash).sort((a, b) => (b.s.rule?.score ?? 0) - (a.s.rule?.score ?? 0))
    const clash = others.filter((t) => step(track, t).clash)
    return { before, after, clash }
  }, [track, order])

  const spots = useMemo(() => fits(track, order).slice(0, 4), [track, order])
  const fromLibrary = useMemo(() => nextTracks(track, library.filter((t) => !inSet.has(t.id)), 14), [track, library, inSet])

  const Row = ({ t, s, action }: { t: Track; s: Step; action?: React.ReactNode }) => (
    <div className="group flex items-center gap-2 rounded-[5px] px-2 py-1 hover:bg-raised">
      <span className="w-[62px] shrink-0">
        <StepBadge s={s} compact />
      </span>
      <button onClick={() => select(t.id)} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[12px] text-fg">{t.title}</span>
        <span className="block truncate text-[11px] text-faint">{t.artist}</span>
      </button>
      <KeyChip k={t.key} />
      <span className="num w-8 text-right text-[11px] text-faint">{t.bpm != null ? Math.round(t.bpm) : '–'}</span>
      {action}
    </div>
  )

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-line">
      <div className="shrink-0 border-b border-line p-4">
        <div className="label mb-2">Seleccionado</div>
        <div className="flex items-center gap-3">
          <Cover track={track} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-fg">{track.title}</div>
            <div className="truncate text-[12px] text-faint">{track.artist}</div>
          </div>
          <KeyChip k={track.key} />
        </div>
        <div className="mt-3 space-y-1 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="text-faint">Entra desde {prev ? <span className="text-soft">{prev.title}</span> : <span className="text-ghost">(abre)</span>}</span>
            {prev && <StepBadge s={step(prev, track)} compact />}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-faint">Sale a {next ? <span className="text-soft">{next.title}</span> : <span className="text-ghost">(cierra)</span>}</span>
            {next && <StepBadge s={step(track, next)} compact />}
          </div>
        </div>
      </div>

      <MarkEditor track={track} order={order} marks={marks} />

      <div className="shrink-0 px-4 pt-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'chapter', label: 'En esta playlist' },
            { value: 'library', label: 'De la biblioteca' },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {tab === 'chapter' ? (
          <>
            <div className="label px-2 pb-1">Dónde encaja</div>
            {spots.length ? (
              spots.map((sp) => {
                const here = sp.index === i
                return (
                  <div key={sp.index} className="flex items-center gap-2 rounded-[5px] px-2 py-1.5 hover:bg-raised">
                    <span className="num w-6 text-[11px] text-faint">{sp.index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-soft">
                      {sp.prev ? sp.prev.title : 'al principio'} <span className="text-ghost">→ este →</span> {sp.next ? sp.next.title : 'al final'}
                    </span>
                    {here ? (
                      <span className="text-[11px] text-faint">acá está</span>
                    ) : (
                      <Btn onClick={() => onMove(sp.index)}>Mover</Btn>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="px-2 pb-2 text-[12px] text-warn">No hay ningún lugar de esta playlist donde encaje con los dos vecinos.</p>
            )}

            <div className="label mt-4 px-2 pb-1">Pueden ir después ({compat.after.length})</div>
            {compat.after.map(({ t, s }) => (
              <Row key={t.id} t={t} s={s} />
            ))}
            <div className="label mt-4 px-2 pb-1">Pueden ir antes ({compat.before.length})</div>
            {compat.before.map(({ t, s }) => (
              <Row key={t.id} t={t} s={s} />
            ))}
            {compat.clash.length > 0 && (
              <>
                <div className="label mt-4 px-2 pb-1 text-warn">No pueden ir pegados ({compat.clash.length})</div>
                {compat.clash.map((t) => (
                  <Row key={t.id} t={t} s={step(track, t)} />
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <p className="px-2 pb-2 text-[11.5px] text-faint">Temas fuera del set que pueden seguir a este por tonalidad y BPM.</p>
            {fromLibrary.map(({ track: t }) => (
              <Row
                key={t.id}
                t={t}
                s={step(track, t)}
                action={
                  <button
                    aria-label="Poner después del seleccionado"
                    title="Poner después del seleccionado"
                    onClick={() => onInsert(t.id, i + 1)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] text-faint opacity-0 hover:bg-fg hover:text-bg group-hover:opacity-100"
                  >
                    <Plus size={13} />
                  </button>
                }
              />
            ))}
          </>
        )}
      </div>
    </aside>
  )
}

/**
 * Vista de orden de una playlist (capítulo): lista vertical para arrastrar,
 * alerta en cada paso que choca, y compatibilidades del tema seleccionado.
 */
export function ChapterOrder({ chapters, activeId, inSet }: { chapters: { chapter: Chapter; tracks: Track[] }[]; activeId: string | null; inSet: Set<string> }) {
  const { selectChapter, setChapterTracks, removeTrack, addTrack, setMarks } = useSets()
  const set = useActiveSet()
  const marks = useMemo(() => set?.marks ?? {}, [set])
  const current = chapters.find((c) => c.chapter.id === activeId) ?? chapters[0]
  const order = useMemo(() => current?.tracks ?? [], [current])
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; over: number | null } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>(0)
  const listRef = useRef<HTMLOListElement>(null)

  const sel = order.find((t) => t.id === selected) ?? null
  const steps = useMemo(() => order.slice(1).map((t, i) => step(order[i], t)), [order])
  // los extras son reserva: sus uniones no cuentan como choques del set
  const isExtra = (i: number) => !!marks[order[i]?.id]?.extra
  const clashes = steps.map((s, i) => ({ s, i })).filter((x) => x.s.clash && !isExtra(x.i) && !isExtra(x.i + 1))
  const bpmJumps = steps.filter((s) => s.bpm != null && Math.abs(s.bpm) > BPM_WARN).length

  useEffect(() => {
    if (selected && !order.some((t) => t.id === selected)) setSelected(null)
  }, [order, selected])

  const notify = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }

  /** Aplica un orden nuevo y avisa si el tema movido quedó chocando. */
  const commit = (ids: string[], movedId: string) => {
    if (!current) return
    setChapterTracks(current.chapter.id, ids)
    const tracks = ids.map((id) => order.find((t) => t.id === id)!).filter(Boolean)
    const at = tracks.findIndex((t) => t.id === movedId)
    const t = tracks[at]
    if (!t) return
    const bad = [tracks[at - 1] && step(tracks[at - 1], t).clash && `${tracks[at - 1].title} → ${t.title} (${keysOf(tracks[at - 1], t)})`, tracks[at + 1] && step(t, tracks[at + 1]).clash && `${t.title} → ${tracks[at + 1].title} (${keysOf(t, tracks[at + 1])})`].filter(Boolean)
    if (bad.length) notify(`Choca: ${bad.join(' · ')}`)
  }

  const moveTo = (id: string, index: number) => {
    const ids = order.map((t) => t.id).filter((x) => x !== id)
    ids.splice(Math.max(0, Math.min(index, ids.length)), 0, id)
    commit(ids, id)
  }

  // Alt + flechas mueve el seleccionado; flechas solas cambian la selección
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      const i = order.findIndex((t) => t.id === selected)
      e.preventDefault()
      if (i < 0) return setSelected(order[0]?.id ?? null)
      const d = e.key === 'ArrowUp' ? -1 : 1
      if (e.altKey) moveTo(order[i].id, i + d)
      else setSelected(order[Math.max(0, Math.min(order.length - 1, i + d))].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!current) return <div className="p-6 text-[13px] text-faint">Este set no tiene capítulos.</div>

  const byId = new Map(order.map((t) => [t.id, t]))
  const mainTracks = order.filter((t) => !marks[t.id]?.extra)
  const dur = mainTracks.reduce((s, t) => s + played(t), 0)
  const sortNow = (m: Marks = marks) => setChapterTracks(current.chapter.id, arrange(order, m).map((t) => t.id))
  /** Pasa a extras lo que sobra para llegar a la duración, y reordena. */
  const trim = (minutes: number) => {
    const ids = trimToMinutes(arrange(order, marks), marks, minutes)
    if (!ids.length) return notify(dur <= minutes * 60 ? 'Ya entra en esa duración.' : 'No se puede recortar más: lo que queda es sí o sí, tiene rol o va pegado a otro.')
    const patch = Object.fromEntries(ids.map((id) => [id, { extra: true }]))
    setMarks(patch)
    sortNow({ ...marks, ...Object.fromEntries(ids.map((id) => [id, { ...marks[id], extra: true }])) })
    notify(`${ids.length} temas pasaron a extras.`)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-5 py-2">
          {chapters.map((c) => (
            <button
              key={c.chapter.id}
              onClick={() => selectChapter(c.chapter.id)}
              className={cx(
                'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 text-[12px] transition-colors',
                c.chapter.id === current.chapter.id ? 'bg-raised text-fg' : 'text-faint hover:text-soft',
              )}
            >
              {c.chapter.name || 'Capítulo'}
              <span className="num text-[10.5px] text-ghost">{c.tracks.length}</span>
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-3 px-5 py-2.5">
          <span className="num text-[11.5px] text-faint">
            {mainTracks.length} temas{order.length > mainTracks.length ? ` + ${order.length - mainTracks.length} extras` : ''} · ~{fmtLong(dur)} en mezcla
          </span>
          {order.length > 1 &&
            (clashes.length ? (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-warn/12 px-2 py-0.5 text-[11.5px] text-warn">
                <AlertTriangle size={12} />
                {clashes.length === 1 ? '1 paso choca' : `${clashes.length} pasos chocan`}
                {clashes.slice(0, 3).map(({ i }) => (
                  <button key={i} onClick={() => setSelected(order[i + 1].id)} className="num underline underline-offset-2 hover:text-fg">
                    {i + 1}→{i + 2}
                  </button>
                ))}
              </span>
            ) : (
              <span className="text-[11.5px] text-signal">Todas las transiciones cumplen tus reglas</span>
            ))}
          {bpmJumps > 0 && <span className="text-[11.5px] text-faint">{bpmJumps} saltos de más de {BPM_WARN} BPM</span>}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Btn variant="line" disabled={order.length < 3} title="Ordena de menos a más por tonalidad, respetando lo que marcaste: abre, cierra, peak, juntos y extras" onClick={() => sortNow()}>
              <ArrowDownUp size={12} /> Ordenar
            </Btn>
            <select
              aria-label="Recortar a una duración"
              value=""
              disabled={order.length < 3}
              onChange={(e) => e.target.value && trim(Number(e.target.value))}
              className="h-7 rounded-[5px] border border-line bg-transparent px-1.5 text-[12px] text-soft outline-none hover:border-line-strong hover:text-fg"
            >
              <option value="" className="bg-surface">
                Recortar a
              </option>
              {[60, 90, 120, 150].map((m) => (
                <option key={m} value={m} className="bg-surface">
                  {fmtLong(m * 60)}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="flex shrink-0 px-5 pb-1.5">
          <span className="truncate text-[11px] text-ghost">
            {sel ? `↔ cómo pega cada tema con «${sel.title}»` : 'Arrastrá para ordenar · ↑↓ elige · Alt + ↑↓ mueve'}
          </span>
        </div>

        <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-6" onDragOver={(e) => e.preventDefault()}>
          {order.map((t, i) => {
            const isSel = t.id === selected
            const vsSel = sel && !isSel ? (order.indexOf(sel) < i ? step(sel, t) : step(t, sel)) : null
            const dropHere = drag && drag.over === i && drag.id !== t.id
            return (
              <li key={t.id}>
                {i > 0 && (
                  <div className={cx('flex h-7 items-center gap-3 pl-[52px]', steps[i - 1].clash && 'bg-warn/[0.06]')}>
                    <span className={cx('h-full w-px', steps[i - 1].clash ? 'bg-warn/60' : 'bg-line')} />
                    <StepBadge s={steps[i - 1]} />
                    {steps[i - 1].clash && <span className="text-[11px] text-warn">{keysOf(order[i - 1], t)} no está en tus reglas</span>}
                  </div>
                )}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/track', t.id)
                    setDrag({ id: t.id, over: null })
                  }}
                  onDragEnd={() => setDrag(null)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    const r = e.currentTarget.getBoundingClientRect()
                    const over = e.clientY < r.top + r.height / 2 ? i : i + 1
                    if (drag && drag.over !== over) setDrag({ ...drag, over })
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/track')
                    const target = drag?.over ?? i
                    setDrag(null)
                    if (!id) return
                    if (order.some((x) => x.id === id)) {
                      const from = order.findIndex((x) => x.id === id)
                      moveTo(id, target > from ? target - 1 : target)
                    } else {
                      addTrack(id, current.chapter.id, target)
                    }
                    setSelected(id)
                  }}
                  onClick={() => setSelected(isSel ? null : t.id)}
                  className={cx(
                    'group relative flex h-12 cursor-pointer items-center gap-3 rounded-[6px] px-2 transition-colors',
                    isSel ? 'bg-raised ring-1 ring-line-strong' : 'hover:bg-surface',
                    drag?.id === t.id && 'opacity-40',
                    (vsSel?.clash || marks[t.id]?.extra) && 'opacity-45',
                  )}
                >
                  {dropHere && drag.over === i && <span className="absolute inset-x-0 -top-[15px] h-[2px] rounded-full bg-fg" />}
                  {drag && drag.over === order.length && i === order.length - 1 && <span className="absolute inset-x-0 -bottom-[2px] h-[2px] rounded-full bg-fg" />}
                  <GripVertical size={14} className="shrink-0 text-ghost group-hover:text-faint" />
                  <span className="num w-5 shrink-0 text-right text-[11px] text-faint">{i + 1}</span>
                  <div className="relative">
                    <Cover track={t} size={34} />
                    <PlayButton id={t.id} size={22} className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-fg">{t.title}</div>
                    <div className="flex items-center gap-2 text-[11.5px] text-faint">
                      <span className="truncate">{t.artist}</span>
                      <MarkBadges mark={marks[t.id]} byId={byId} />
                    </div>
                  </div>
                  {vsSel && (
                    <span className="w-[92px] shrink-0" title={order.indexOf(sel!) < i ? 'Si va después del seleccionado' : 'Si va antes del seleccionado'}>
                      <StepBadge s={vsSel} compact vs />
                    </span>
                  )}
                  <KeyChip k={t.key} />
                  <span className="num w-10 text-right text-[12px] text-soft">{t.bpm != null ? Math.round(t.bpm) : '–'}</span>
                  <span className="num w-9 text-right text-[11px] text-faint" title="Energía">
                    E {fmt1(t.energy)}
                  </span>
                  <span className="num w-10 text-right text-[11px] text-faint">{fmtDuration(t.duration)}</span>
                  <span className="flex w-[66px] shrink-0 justify-end gap-0.5 opacity-0 group-hover:opacity-100">
                    <button aria-label="Subir" onClick={(e) => (e.stopPropagation(), moveTo(t.id, i - 1))} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded-[4px] text-faint hover:bg-hover hover:text-fg disabled:opacity-30">
                      <ArrowUp size={12} />
                    </button>
                    <button aria-label="Bajar" onClick={(e) => (e.stopPropagation(), moveTo(t.id, i + 1))} disabled={i === order.length - 1} className="grid h-6 w-6 place-items-center rounded-[4px] text-faint hover:bg-hover hover:text-fg disabled:opacity-30">
                      <ArrowDown size={12} />
                    </button>
                    <button aria-label="Quitar de la playlist" onClick={(e) => (e.stopPropagation(), removeTrack(current.chapter.id, t.id))} className="grid h-6 w-6 place-items-center rounded-[4px] text-faint hover:bg-hover hover:text-fg">
                      <X size={12} />
                    </button>
                  </span>
                </div>
              </li>
            )
          })}
          {!order.length && <li className="py-10 text-[13px] text-faint">Esta playlist está vacía. Arrastrá temas desde la Biblioteca o sumalos desde la vista Capítulos.</li>}
        </ol>

        {toast && (
          <div role="status" className={cx('rise pointer-events-none absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-[7px] border bg-surface px-3 py-2 text-[12px]', toast.startsWith('Choca') ? 'border-warn/40 text-warn' : 'border-line-strong text-fg')}>
            {toast.startsWith('Choca') && <AlertTriangle size={13} />} {toast}
          </div>
        )}
      </div>

      {sel ? (
        <Inspector key={sel.id} track={sel} order={order} inSet={inSet} marks={marks} onMove={(index) => moveTo(sel.id, index)} onInsert={(id, index) => addTrack(id, current.chapter.id, index)} />
      ) : (
        <aside className="flex w-[340px] shrink-0 flex-col justify-center border-l border-line px-8 text-[12.5px] leading-relaxed text-faint">
          Elegí un tema para ver dónde encaja, cuáles pueden ir antes o después según tus reglas de tonalidad, y cuáles no pueden ir pegados.
        </aside>
      )}
    </div>
  )
}
