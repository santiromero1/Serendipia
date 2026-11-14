import { Fragment, useMemo, useState } from 'react'
import { ArrowDownUp, Download, Plus, Trash2, X } from 'lucide-react'
import type { Track } from '@/lib/types'
import { keyRule } from '@/lib/harmony'
import { magicSort, matching, nextTracks, type Suggestion } from '@/lib/similarity'
import { Btn, Chips, Cover, cx, fmtLong, PlayButton, range, Segmented } from '@/components/bits'
import { SuggestionRow } from '@/components/DetailPanel'
import { FromRekordbox } from '@/components/FromRekordbox'
import { ChapterOrder } from '@/components/ChapterOrder'
import { matchesFilters, useFilters } from '@/stores/filters'
import { useLibrary } from '@/stores/library'
import { CHAPTER_PRESETS, useActiveSet, useSets, type Chapter } from '@/stores/sets'
import { useUI } from '@/stores/ui'

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/[/\\:]/g, '-')
  a.click()
  URL.revokeObjectURL(url)
}

function downloadM3U(name: string, root: string, tracks: Track[]) {
  const lines = ['#EXTM3U', ...tracks.flatMap((t) => [`#EXTINF:${t.duration ?? -1},${t.artist} - ${t.title}`, `${root}/${t.rel}`])]
  download(`${name}.m3u8`, lines.join('\n') + '\n', 'audio/x-mpegurl')
}

const xmlAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * XML de rekordbox: una carpeta con el nombre del set y una playlist por capítulo.
 * Los temas van solo con nombre, artista y ruta, sin cues, grilla ni tonalidad,
 * para no pisar el análisis que rekordbox ya tiene.
 */
export function rekordboxXml(setName: string, root: string, chapters: { name: string; tracks: Track[] }[]): string {
  const filled = chapters.filter((c) => c.tracks.length)
  const ids = new Map<string, number>()
  const entries: string[] = []
  for (const t of filled.flatMap((c) => c.tracks)) {
    if (ids.has(t.id)) continue
    ids.set(t.id, ids.size + 1)
    const location = 'file://localhost' + `${root}/${t.rel}`.split('/').map(encodeURIComponent).join('/')
    entries.push(
      `    <TRACK TrackID="${ids.get(t.id)}" Name="${xmlAttr(t.title)}" Artist="${xmlAttr(t.artist)}" TotalTime="${t.duration ?? 0}" Location="${xmlAttr(location)}"/>`,
    )
  }
  const playlists = filled.map(
    (c) =>
      `        <NODE Name="${xmlAttr(c.name || 'Capítulo')}" Type="1" KeyType="0" Entries="${c.tracks.length}">\n` +
      c.tracks.map((t) => `          <TRACK Key="${ids.get(t.id)}"/>`).join('\n') +
      '\n        </NODE>',
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<DJ_PLAYLISTS Version="1.0.0">',
    '  <PRODUCT Name="rekordbox" Version="6.0.0" Company="AlphaTheta"/>',
    `  <COLLECTION Entries="${entries.length}">`,
    ...entries,
    '  </COLLECTION>',
    '  <PLAYLISTS>',
    '    <NODE Type="0" Name="ROOT" Count="1">',
    `      <NODE Type="0" Name="${xmlAttr(setName || 'Set')}" Count="${playlists.length}">`,
    ...playlists,
    '      </NODE>',
    '    </NODE>',
    '  </PLAYLISTS>',
    '</DJ_PLAYLISTS>',
    '',
  ].join('\n')
}

/** Unión entre dos temas seguidos: regla Camelot usada y salto de BPM. */
function Transition({ from, to }: { from: Track; to: Track }) {
  const rule = keyRule(from.key, to.key)
  const unknown = !from.key || !to.key
  const bpm = from.bpm != null && to.bpm != null ? to.bpm - from.bpm : null
  return (
    <div className="flex w-9 shrink-0 flex-col items-center justify-center gap-0.5 self-stretch pb-[58px]">
      <span
        className={cx('num text-[10px] leading-none', rule ? 'text-signal' : unknown ? 'text-ghost' : 'text-warn')}
        title={rule ? `Regla ${rule.rank}: ${rule.label}` : unknown ? 'Falta la tonalidad de uno de los dos' : 'Ninguna de tus reglas Camelot cubre este paso'}
      >
        {rule ? rule.label : unknown ? '?' : 'choca'}
      </span>
      <span className="h-px w-5 bg-line-strong" />
      <span className={cx('num text-[10px] leading-none', bpm != null && Math.abs(bpm) > 4 ? 'text-warn' : 'text-ghost')}>
        {bpm == null ? '' : bpm === 0 ? '=' : `${bpm > 0 ? '+' : ''}${bpm}`}
      </span>
    </div>
  )
}

function ChapterRow({ chapter, tracks, active, root }: { chapter: Chapter; tracks: Track[]; active: boolean; root: string }) {
  const { selectChapter, renameChapter, deleteChapter, setChapterTracks, addTrack, removeTrack } = useSets()
  const select = useUI((s) => s.select)
  const [over, setOver] = useState<number | null>(null)
  const dur = tracks.reduce((s, t) => s + (t.duration ?? 0), 0)

  const drop = (e: React.DragEvent, index?: number) => {
    const id = e.dataTransfer.getData('text/track')
    setOver(null)
    if (!id) return
    e.preventDefault()
    e.stopPropagation()
    addTrack(id, chapter.id, index)
  }

  return (
    <section
      onClick={() => selectChapter(chapter.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => drop(e)}
      className={cx('border-b border-line px-5 pb-4 pt-3 transition-colors', active ? 'bg-surface' : 'hover:bg-surface/50')}
    >
      <div className="mb-2.5 flex items-center gap-3">
        <span className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-signal' : 'bg-line-strong')} aria-hidden />
        <input
          value={chapter.name}
          aria-label="Nombre del capítulo"
          onChange={(e) => renameChapter(chapter.id, e.target.value)}
          className="w-[130px] shrink-0 bg-transparent text-[13px] font-medium text-fg outline-none placeholder:text-ghost"
          placeholder="Capítulo"
        />
        <span className="num min-w-0 truncate text-[11.5px] text-faint">
          {tracks.length} temas · {fmtLong(dur)} · {range(tracks, (t) => t.bpm)} BPM · energía {range(tracks, (t) => t.energy)} · baile {range(tracks, (t) => t.dance)}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <Btn
            disabled={tracks.length < 3}
            title="Ordenar de menos a más energía encadenando tonalidades compatibles"
            onClick={() => setChapterTracks(chapter.id, magicSort(tracks).map((t) => t.id))}
          >
            <ArrowDownUp size={12} /> Ordenar
          </Btn>
          <Btn disabled={!tracks.length} title="Exportar el capítulo como playlist M3U8" onClick={() => downloadM3U(chapter.name, root, tracks)}>
            <Download size={12} />
          </Btn>
          <Btn
            title="Borrar capítulo"
            aria-label="Borrar capítulo"
            onClick={(e) => {
              e.stopPropagation()
              if (!tracks.length || confirm(`¿Borrar el capítulo “${chapter.name}” con sus ${tracks.length} temas?`)) deleteChapter(chapter.id)
            }}
          >
            <Trash2 size={12} />
          </Btn>
        </span>
      </div>

      <div className="flex overflow-x-auto pb-1">
        {tracks.map((t, i) => (
          <Fragment key={t.id}>
            {i > 0 && <Transition from={tracks[i - 1]} to={t} />}
            <article
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/track', t.id)}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(i)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(e, i)}
              onClick={() => select(t.id)}
              className={cx('group relative w-[128px] shrink-0 cursor-pointer', over === i && 'opacity-50')}
            >
              <div className="relative">
                <Cover track={t} size={128} />
                <PlayButton id={t.id} size={30} className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100" />
                <button
                  aria-label="Quitar del capítulo"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTrack(chapter.id, t.id)
                  }}
                  className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-bg/80 text-soft opacity-0 hover:text-fg group-hover:opacity-100"
                >
                  <X size={11} />
                </button>
              </div>
              <div className="mt-1.5 truncate text-[12.5px] text-fg">{t.title}</div>
              <div className="truncate text-[11.5px] text-faint">{t.artist}</div>
              <div className="mt-1">
                <Chips track={t} />
              </div>
            </article>
          </Fragment>
        ))}
        <div
          className={cx(
            'grid h-[128px] w-[128px] shrink-0 place-items-center rounded-[3px] border border-dashed text-[11.5px]',
            tracks.length ? 'ml-9' : '',
            active ? 'border-line-strong text-soft' : 'border-line text-ghost',
          )}
        >
          <span className="px-3 text-center">{tracks.length ? 'Soltá un tema acá' : 'Empezá con uno o dos temas semilla'}</span>
        </div>
      </div>
    </section>
  )
}

function EnergyCurve({ chapters }: { chapters: { name: string; tracks: Track[] }[] }) {
  const all = chapters.flatMap((c) => c.tracks)
  if (all.length < 2) return null
  const W = 300
  const H = 40
  const x = (i: number) => (i / (all.length - 1)) * W
  const y = (e: number | null) => H - 3 - (((e ?? 5) - 1) / 9) * (H - 6)
  let acc = 0
  const bounds = chapters.slice(0, -1).map((c) => (acc += c.tracks.length))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Curva de energía del set" className="min-w-0 shrink" preserveAspectRatio="none">
      {bounds
        .filter((b) => b > 0 && b < all.length)
        .map((b) => (
          <line key={b} x1={x(b - 0.5)} x2={x(b - 0.5)} y1={0} y2={H} stroke="var(--color-line)" />
        ))}
      <polyline fill="none" stroke="var(--color-fg)" strokeWidth={1.25} strokeLinejoin="round" points={all.map((t, i) => `${x(i)},${y(t.energy)}`).join(' ')} />
      {all.map((t, i) => (
        <circle key={t.id} cx={x(i)} cy={y(t.energy)} r={1.6} fill="var(--color-fg)">
          <title>{`${t.title} · energía ${t.energy ?? '–'}`}</title>
        </circle>
      ))}
    </svg>
  )
}

function Explorer({ chapter, chapterTracks, inSet }: { chapter: Chapter | null; chapterTracks: Track[]; inSet: Set<string> }) {
  const tracks = useLibrary((s) => s.tracks)
  const filters = useFilters()
  const addTrack = useSets((s) => s.addTrack)
  const dismiss = useSets((s) => s.dismiss)
  const dismissed = useSets((s) => (s.activeSetId ? s.dismissed[s.activeSetId] : undefined))
  const [tab, setTab] = useState<'discover' | 'search'>('discover')
  const [kind, setKind] = useState<'match' | 'next'>('match')

  const pool = useMemo(() => {
    const out = new Set(dismissed ?? [])
    return tracks.filter((t) => !inSet.has(t.id) && !out.has(t.id) && matchesFilters(t, filters))
  }, [tracks, inSet, dismissed, filters])

  const list: Suggestion[] = useMemo(() => {
    if (tab === 'search') return pool.slice(0, 80).map((track) => ({ track, score: 0 }))
    if (!chapterTracks.length) return []
    return kind === 'match' ? matching(chapterTracks, pool, 30) : nextTracks(chapterTracks[chapterTracks.length - 1], pool, 30)
  }, [tab, kind, pool, chapterTracks])

  return (
    <aside className="flex w-[304px] shrink-0 flex-col border-l border-line">
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <span className="text-[13px] font-medium text-fg">Explorador</span>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'discover', label: 'Descubrir' },
            { value: 'search', label: 'Buscar' },
          ]}
        />
      </div>
      {tab === 'discover' && (
        <div className="flex shrink-0 items-center justify-between px-4 pb-2">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'match', label: 'Parecidos' },
              { value: 'next', label: 'Siguiente' },
            ]}
          />
          <span className="num text-[11px] text-faint">{pool.length} en juego</span>
        </div>
      )}
      <p className="shrink-0 px-4 pb-2 text-[11.5px] leading-snug text-faint">
        {!chapter
          ? 'Elegí un capítulo para recibir sugerencias.'
          : tab === 'search'
            ? 'Resultado de los filtros de la izquierda. Arrastrá o usá + para sumar.'
            : kind === 'match'
              ? `Lo que más se parece al conjunto de “${chapter.name}”.`
              : `Lo que puede seguir al último tema de “${chapter.name}” por tonalidad y BPM.`}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {list.length ? (
          list.map((s) => (
            <SuggestionRow
              key={s.track.id}
              s={s}
              onAdd={chapter ? (t) => addTrack(t.id, chapter.id) : undefined}
              extra={
                tab === 'discover' ? (
                  <button
                    aria-label="No sugerir de nuevo en este set"
                    title="No sugerir de nuevo en este set"
                    onClick={(e) => {
                      e.stopPropagation()
                      dismiss(s.track.id)
                    }}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] text-ghost opacity-0 hover:text-fg group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                ) : undefined
              }
            />
          ))
        ) : (
          <p className="px-2 py-4 text-[12px] text-faint">
            {tab === 'discover' && chapter && !chapterTracks.length
              ? 'Este capítulo está vacío. Sumá uno o dos temas semilla desde Buscar, la Biblioteca o el Mapa, y acá aparecen los que combinan.'
              : 'Nada para sugerir con los filtros actuales.'}
          </p>
        )}
      </div>
    </aside>
  )
}

export function SetsPage() {
  const byId = useLibrary((s) => s.byId)
  const root = useLibrary((s) => s.lib?.root ?? '')
  const { sets, activeChapterId, createSet, renameSet, deleteSet, selectSet, addChapter } = useSets()
  const set = useActiveSet()

  const chapters = useMemo(
    () => (set?.chapters ?? []).map((c) => ({ chapter: c, name: c.name, tracks: c.trackIds.map((id) => byId.get(id)).filter((t): t is Track => !!t) })),
    [set, byId],
  )
  const all = chapters.flatMap((c) => c.tracks)
  const inSet = useMemo(() => new Set(all.map((t) => t.id)), [all])
  const active = chapters.find((c) => c.chapter.id === activeChapterId) ?? null
  const [view, setView] = useState<'chapters' | 'order'>('chapters')

  if (!set) {
    return (
      <div className="grid flex-1 place-items-center px-6">
        <div className="max-w-[420px]">
          <h1 className="text-[18px] font-medium text-fg">Armá un set por capítulos</h1>
          <p className="mt-2 text-[13px] text-soft">
            Cada capítulo es un bloque de temas con la misma vibra. Podés arrancar de cero o abrir una carpeta de rekordbox: cada playlist pasa a ser un capítulo. No fija el orden de la noche: te deja improvisar adentro de cada bloque y saltar al siguiente cuando la pista lo pide.
          </p>
          <div className="mt-5 flex gap-2">
            <Btn variant="solid" onClick={() => createSet('Set nuevo')}>
              Crear con {CHAPTER_PRESETS.length} capítulos
            </Btn>
            <Btn variant="line" onClick={() => createSet('Set nuevo', ['Capítulo 1'])}>
              Empezar vacío
            </Btn>
            <FromRekordbox />
          </div>
          <p className="mt-3 text-[11.5px] text-faint">{CHAPTER_PRESETS.join(' · ')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-2.5">
          <div className="shrink-0">
            <input
              value={set.name}
              aria-label="Nombre del set"
              onChange={(e) => renameSet(set.id, e.target.value)}
              className="w-[220px] bg-transparent text-[15px] font-medium text-fg outline-none"
            />
            <div className="num whitespace-nowrap text-[11.5px] text-faint">
              {chapters.length} capítulos · {all.length} temas · {fmtLong(all.reduce((s, t) => s + (t.duration ?? 0), 0))}
            </div>
          </div>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'chapters', label: 'Capítulos' },
              { value: 'order', label: 'Orden' },
            ]}
          />
          {sets.length > 1 && (
            <select
              aria-label="Cambiar de set"
              value={set.id}
              onChange={(e) => selectSet(e.target.value)}
              className="h-7 rounded-[5px] border border-line bg-transparent px-1.5 text-[12px] text-soft outline-none"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id} className="bg-surface">
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto flex min-w-0 items-center gap-1.5">
            <EnergyCurve chapters={chapters} />
            <FromRekordbox />
            <Btn variant="line" onClick={() => createSet('Set nuevo')}>
              <Plus size={12} /> Set
            </Btn>
            <Btn
              variant="solid"
              disabled={!all.length}
              title="XML para rekordbox: una carpeta con el set y una playlist por capítulo"
              onClick={() => download(`${set.name}.xml`, rekordboxXml(set.name, root, chapters), 'application/xml')}
            >
              <Download size={12} /> Exportar a rekordbox
            </Btn>
            <Btn
              aria-label="Borrar set"
              title="Borrar set"
              onClick={() => {
                if (confirm(`¿Borrar el set “${set.name}”? No se puede deshacer.`)) deleteSet(set.id)
              }}
            >
              <Trash2 size={12} />
            </Btn>
          </div>
        </header>

        {view === 'order' ? (
          <ChapterOrder chapters={chapters} activeId={activeChapterId} inSet={inSet} />
        ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {chapters.map((c) => (
            <ChapterRow key={c.chapter.id} chapter={c.chapter} tracks={c.tracks} active={c.chapter.id === activeChapterId} root={root} />
          ))}
          <div className="px-5 py-4">
            <Btn variant="line" onClick={() => addChapter(`Capítulo ${chapters.length + 1}`)}>
              <Plus size={12} /> Capítulo
            </Btn>
          </div>
        </div>
        )}
      </div>
      {view === 'chapters' && <Explorer chapter={active?.chapter ?? null} chapterTracks={active?.tracks ?? []} inSet={inSet} />}
    </div>
  )
}
