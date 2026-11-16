import { useMemo, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildAdvice, type Advice } from '@/lib/advice'
import { Btn, Chips, Cover, cx, PlayButton, Segmented } from '@/components/bits'
import { useLibrary } from '@/stores/library'
import { useUI } from '@/stores/ui'

/** Consejos que el DJ ya revisó y decidió dejar como están. */
const useReviewed = create<{ ids: string[]; add: (id: string) => void; clear: () => void }>()(
  persist(
    (set) => ({
      ids: [],
      add: (id) => set((s) => ({ ids: [...s.ids, id] })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'serendipia.advice' },
  ),
)

const place = (genre: string, crate: string | null) => (crate ? `${genre} · ${crate}` : genre)

function Row({ a }: { a: Advice }) {
  const select = useUI((s) => s.select)
  const selectedId = useUI((s) => s.selectedId)
  const review = useReviewed((s) => s.add)
  const [open, setOpen] = useState(false)
  const t = a.track
  return (
    <li className={cx('border-b border-line', selectedId === t.id && 'bg-surface')}>
      <div className="group flex items-center gap-4 px-5 py-3">
        <div className="relative shrink-0">
          <Cover track={t} size={44} />
          <PlayButton id={t.id} size={24} className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100" />
        </div>
        <button onClick={() => select(t.id)} className="w-[250px] min-w-0 shrink-0 text-left">
          <span className="block truncate text-[13px] text-fg">{t.title}</span>
          <span className="block truncate text-[11.5px] text-faint">{t.artist}</span>
          <span className="mt-0.5 block">
            <Chips track={t} />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="text-soft">{place(t.genre, t.crate)}</span>
            <ArrowRight size={13} className="text-faint" />
            <span className="font-medium text-fg">{place(a.genre, a.crate)}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-faint">
            {a.kind === 'genre'
              ? `${a.hits} de sus ${a.of} temas más parecidos están en ${a.genre}`
              : `${a.hits} de sus ${a.of} parecidos dentro de ${a.genre} están en ${a.crate}`}
            {a.own === 0 ? ' y ninguno donde está hoy.' : `, y ${a.own} donde está hoy.`}{' '}
            <button onClick={() => setOpen(!open)} className="text-soft underline underline-offset-2 hover:text-fg">
              {open ? 'Ocultar' : 'Ver cuáles'}
            </button>
          </p>
        </div>

        <Btn variant="line" title="Dejarlo donde está y no volver a sugerirlo" onClick={() => review(t.id)}>
          <Check size={12} /> Está bien ahí
        </Btn>
      </div>

      {open && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-4 gap-y-1 px-5 pb-3 pl-[84px]">
          {a.neighbors.map((n) => (
            <li key={n.id} className="group flex items-center gap-2.5 rounded-[5px] py-1">
              <div className="relative shrink-0">
                <Cover track={n} size={30} />
                <PlayButton id={n.id} size={20} className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100" />
              </div>
              <button onClick={() => select(n.id)} className="min-w-0 text-left">
                <span className="block truncate text-[12px] text-soft group-hover:text-fg">{n.title}</span>
                <span className="block truncate text-[11px] text-ghost">{n.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function AdvicePage() {
  const tracks = useLibrary((s) => s.lib?.tracks ?? [])
  const root = useLibrary((s) => s.lib?.root ?? '')
  const reviewed = useReviewed((s) => s.ids)
  const clear = useReviewed((s) => s.clear)
  const [kind, setKind] = useState<'all' | 'genre' | 'crate'>('all')

  // sobre la biblioteca tal como está en disco: las correcciones manuales de energía no cambian esto
  const all = useMemo(() => buildAdvice(tracks), [tracks])
  const hidden = new Set(reviewed)
  const pending = all.filter((a) => !hidden.has(a.track.id))
  const list = pending.filter((a) => kind === 'all' || a.kind === kind)
  const hasSound = tracks.some((t) => t.emb)

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center gap-3 px-5">
        <h1 className="text-[14px] font-medium text-fg">Consejos</h1>
        <span className="num text-[12px] text-faint">{pending.length} para revisar</span>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'genre', label: 'Otra carpeta' },
            { value: 'crate', label: 'Otro cajón' },
          ]}
        />
        {reviewed.length > 0 && (
          <button onClick={clear} className="ml-auto text-[11.5px] text-faint hover:text-fg">
            Volver a mostrar los {reviewed.length} revisados
          </button>
        )}
      </header>

      <p className="max-w-[760px] shrink-0 px-5 pb-3 text-[12px] leading-relaxed text-faint">
        Temas que suenan más parecidos a los de otra carpeta o cajón que a los de donde están. Es una pista para escuchar y decidir, no una corrección:
        tus cajones son criterio tuyo. Serendipia no mueve archivos{root ? `; si cambiás algo en ${root}, volvé a escanear.` : '.'}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-line">
        {!hasSound ? (
          <p className="px-5 py-10 text-[13px] text-faint">
            Los consejos necesitan el análisis de sonido. En la Biblioteca, tocá “Analizar mi música” y elegí tu carpeta.
          </p>
        ) : list.length === 0 ? (
          <p className="px-5 py-10 text-[13px] text-faint">
            {all.length === 0 ? 'Nada para sugerir: cada tema se parece a los de su carpeta.' : 'No quedan consejos por revisar en esta vista.'}
          </p>
        ) : (
          <ul>
            {list.map((a) => (
              <Row key={a.track.id} a={a} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
