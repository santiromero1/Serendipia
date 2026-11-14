import { useMemo, useState } from 'react'
import { Plus, RotateCcw, X } from 'lucide-react'
import { FEATURE_LABEL, type Feature, type Track } from '@/lib/types'
import { neighbors, nextTracks, type Suggestion } from '@/lib/similarity'
import { useLibrary } from '@/stores/library'
import { useSets } from '@/stores/sets'
import { useUI } from '@/stores/ui'
import { Chips, Cover, fmt1, fmtDuration, PlayButton, Segmented } from './bits'

export function SuggestionRow({ s, onAdd, extra }: { s: Suggestion; onAdd?: (t: Track) => void; extra?: React.ReactNode }) {
  const select = useUI((u) => u.select)
  const t = s.track
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/track', t.id)}
      onClick={() => select(t.id)}
      className="group flex cursor-pointer items-center gap-2.5 rounded-[5px] px-2 py-1.5 hover:bg-raised"
    >
      <div className="relative">
        <Cover track={t} size={36} />
        <PlayButton id={t.id} size={22} className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] text-fg">{t.title}</div>
        <div className="truncate text-[11.5px] text-faint">{t.artist}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <Chips track={t} />
          {s.rule && <span className="num text-[10.5px] text-signal">{s.rule.label}</span>}
        </div>
      </div>
      {extra}
      {onAdd && (
        <button
          aria-label="Agregar al capítulo"
          onClick={(e) => {
            e.stopPropagation()
            onAdd(t)
          }}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] text-faint opacity-0 hover:bg-fg hover:text-bg group-hover:opacity-100"
        >
          <Plus size={13} />
        </button>
      )}
    </div>
  )
}

function FeatureEditor({ track, feature }: { track: Track; feature: Feature }) {
  const setFeature = useLibrary((s) => s.setFeature)
  const edited = useLibrary((s) => s.overrides[track.id]?.[feature] != null)
  const value = track[feature]
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-soft">{FEATURE_LABEL[feature]}</span>
        <span className="flex items-center gap-1.5">
          {edited && (
            <button title="Volver al valor estimado" aria-label="Volver al valor estimado" onClick={() => setFeature(track.id, feature, null)} className="text-faint hover:text-fg">
              <RotateCcw size={11} />
            </button>
          )}
          <span className="num text-[12px] text-fg">{fmt1(value)}</span>
          <span className="text-[10.5px] text-ghost">{edited ? 'tuyo' : value == null ? '' : 'estimado'}</span>
        </span>
      </div>
      <input
        type="range"
        aria-label={FEATURE_LABEL[feature]}
        min={1}
        max={10}
        step={0.5}
        value={value ?? 5}
        onChange={(e) => setFeature(track.id, feature, Number(e.target.value))}
        className="mt-1 h-3 w-full"
      />
    </div>
  )
}

export function DetailPanel() {
  const id = useUI((s) => s.selectedId)
  const select = useUI((s) => s.select)
  const track = useLibrary((s) => (id ? s.byId.get(id) : undefined))
  const tracks = useLibrary((s) => s.tracks)
  const addTrack = useSets((s) => s.addTrack)
  const [tab, setTab] = useState<'near' | 'next'>('near')

  const list = useMemo(() => {
    if (!track) return []
    return tab === 'near' ? neighbors(track, tracks, 10) : nextTracks(track, tracks, 10)
  }, [track, tracks, tab])

  if (!track) return null
  return (
    <aside className="rise flex h-full w-[320px] shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex shrink-0 items-start gap-3 p-4">
        <div className="relative">
          <Cover track={track} size={84} />
          <PlayButton id={track.id} size={30} className="absolute bottom-1.5 right-1.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium leading-snug text-fg">{track.title}</div>
          <div className="mt-0.5 text-[12.5px] text-soft">{track.artist}</div>
          {track.label && <div className="mt-0.5 truncate text-[11.5px] text-faint">{track.label}</div>}
        </div>
        <button aria-label="Cerrar detalle" onClick={() => select(null)} className="-mr-1 -mt-1 grid h-6 w-6 place-items-center rounded-[4px] text-faint hover:bg-raised hover:text-fg">
          <X size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-4 text-[12px]">
          <dt className="text-faint">Carpeta</dt>
          <dd className="text-fg">
            {track.genre}
            {track.crateName && <span className="text-soft"> · {track.crateName}</span>}
          </dd>
          <dt className="text-faint">BPM</dt>
          <dd className="num text-fg">
            {track.bpm ?? '–'} {track.bpmSource && <span className="font-sans text-ghost">{track.bpmSource}</span>}
          </dd>
          <dt className="text-faint">Tonalidad</dt>
          <dd className="num text-fg">
            {track.key ?? '–'} {track.keySource && <span className="font-sans text-ghost">{track.keySource}</span>}
          </dd>
          <dt className="text-faint">Duración</dt>
          <dd className="num text-fg">
            {fmtDuration(track.duration)} <span className="font-sans uppercase text-ghost">{track.format}</span>
          </dd>
          {track.stars != null && (
            <>
              <dt className="text-faint">Estrellas</dt>
              <dd className="text-fg">{'★'.repeat(track.stars)}</dd>
            </>
          )}
          {track.tags.length > 0 && (
            <>
              <dt className="text-faint">Etiquetas</dt>
              <dd className="text-fg">{track.tags.join(' · ')}</dd>
            </>
          )}
        </dl>

        <div className="mt-4 space-y-3 border-t border-line px-4 py-4">
          <FeatureEditor track={track} feature="energy" />
          <FeatureEditor track={track} feature="dance" />
          <FeatureEditor track={track} feature="bright" />
        </div>

        <div className="border-t border-line px-2 py-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'near', label: 'Parecidos' },
                { value: 'next', label: 'Siguen bien' },
              ]}
            />
          </div>
          {list.length ? (
            list.map((s) => <SuggestionRow key={s.track.id} s={s} onAdd={(t) => addTrack(t.id)} />)
          ) : (
            <p className="px-2 py-3 text-[12px] text-faint">Ningún tema cumple BPM y tonalidad para seguir a este.</p>
          )}
        </div>
      </div>
    </aside>
  )
}
