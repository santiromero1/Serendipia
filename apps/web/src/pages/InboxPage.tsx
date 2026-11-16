import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, RefreshCw, Trash2 } from 'lucide-react'
import { Btn, cx, fmtDuration, PlayButton } from '@/components/bits'
import { useLibrary } from '@/stores/library'
import { useActiveSet, useSets } from '@/stores/sets'
import { useUI } from '@/stores/ui'

interface Place {
  dir: string
  genre: string
  crate: string | null
  n: number
}
interface Item {
  token: string
  rel: string
  format: string
  analyzed: boolean
  title: string
  artist: string | null
  label: string | null
  tagGenre: string | null
  bpm: number | null
  key: string | null
  duration: number | null
  name: string
  style: string | null
  options: { dir: string; share: number }[]
  neighbors: { id: string; title: string; artist: string; dir: string; sim: number }[]
  duplicate: { id: string; rel: string; format: string } | null
}
type Row = { token: string; rel: string; item?: Item; error?: string; done?: string }

const post = async (url: string, body: unknown) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-serendipia': '1' }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'No se pudo')
  return data
}
const shortDir = (dir: string) => dir.replace(/\/\d+ - /, ' · ').replace(/\s*\(.*\)$/, '')

function Card({ row, places, active, onFocus, onDone }: { row: Row; places: Place[]; active: boolean; onFocus: () => void; onDone: (text: string) => void }) {
  const select = useUI((s) => s.select)
  const item = row.item
  const [dir, setDir] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forSet, setForSet] = useState<'' | 'candidate' | 'must' | 'open'>('')
  const activeSet = useActiveSet()
  const addCandidate = useSets((s) => s.addCandidate)
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setDir(item.options[0]?.dir ?? null)
    }
  }, [item])
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const move = useCallback(async () => {
    if (!item || !dir || busy) return
    setBusy(true)
    setError(null)
    try {
      const moved = await post('/api/inbox/move', { token: item.token, dir, name })
      if (forSet) addCandidate(moved.id, forSet === 'must' ? { must: true } : forSet === 'open' ? { role: 'open' } : undefined)
      onDone(`Movido a ${shortDir(dir)}${forSet ? ' · candidato del set' : ''}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo mover')
    }
    setBusy(false)
  }, [item, dir, name, busy, onDone, forSet, addCandidate])

  const discard = async () => {
    if (!item || !confirm(`¿Mandar “${item.name}” a la Papelera?`)) return
    try {
      await post('/api/inbox/trash', { token: item.token })
      onDone('En la Papelera')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descartar')
    }
  }

  // con la tarjeta activa: 1, 2, 3 eligen destino y Enter mueve
  useEffect(() => {
    if (!active || !item || row.done) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return
      const n = Number(e.key)
      if (n >= 1 && n <= item.options.length) setDir(item.options[n - 1].dir)
      if (e.key === 'Enter') move()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, item, row.done, move])

  if (row.done)
    return (
      <li className="flex items-center gap-3 border-b border-line px-5 py-2.5 text-[12.5px] text-faint">
        <Check size={13} className="text-signal" />
        <span className="truncate">{item?.name ?? row.rel}</span>
        <span className="ml-auto shrink-0 text-soft">{row.done}</span>
      </li>
    )
  if (!item)
    return (
      <li className="border-b border-line px-5 py-3 text-[12.5px]">
        <span className="text-soft">{row.rel}</span> <span className={row.error ? 'text-warn' : 'text-ghost'}>{row.error ?? 'analizando'}</span>
      </li>
    )

  const custom = dir != null && !item.options.some((o) => o.dir === dir)
  return (
    <li ref={ref} onClick={onFocus} className={cx('border-b border-line px-5 py-3.5', active && 'bg-surface')}>
      <div className="flex items-start gap-3">
        <PlayButton id={`inbox:${item.token}`} label={item.name} size={30} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nombre del archivo"
            className="w-full bg-transparent text-[13px] font-medium text-fg outline-none focus:underline focus:decoration-line-strong focus:underline-offset-4"
          />
          <div className="num mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-faint">
            <span className="uppercase">{item.format}</span>
            {item.bpm && <span>{Math.round(item.bpm)} BPM</span>}
            {item.key && <span>{item.key}</span>}
            <span>{fmtDuration(item.duration)}</span>
            {item.tagGenre && <span className="font-sans">tag: {item.tagGenre}</span>}
            {item.style && <span className="font-sans">suena a {item.style}</span>}
            {name !== item.rel.split('/').pop() && <span className="font-sans text-ghost">antes: {item.rel}</span>}
          </div>

          {item.duplicate && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-warn">
              <AlertTriangle size={12} /> Ya lo tenés en {item.duplicate.rel.split('/').slice(0, -1).join(' / ')} ({item.duplicate.format.toUpperCase()})
              {item.duplicate.format !== 'aiff' && item.format === 'aiff' ? '. Este es AIFF: conviene quedarse con este.' : '.'}
            </p>
          )}
          {item.format === 'flac' && <p className="mt-2 text-[12px] text-warn">FLAC: tu XDJ-RX no lo lee.</p>}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {item.options.map((o, i) => (
              <button
                key={o.dir}
                aria-pressed={dir === o.dir}
                onClick={() => setDir(o.dir)}
                className={cx(
                  'inline-flex h-7 items-center gap-1.5 rounded-[5px] border px-2 text-[12px] transition-colors',
                  dir === o.dir ? 'border-fg bg-fg text-bg' : 'border-line text-soft hover:border-line-strong hover:text-fg',
                )}
              >
                <span className={cx('num text-[10px]', dir === o.dir ? 'text-bg/60' : 'text-ghost')}>{i + 1}</span>
                {shortDir(o.dir)}
                <span className={cx('num text-[10.5px]', dir === o.dir ? 'text-bg/60' : 'text-faint')}>{o.share}%</span>
              </button>
            ))}
            <select
              aria-label="Otro destino"
              value={custom ? dir! : ''}
              onChange={(e) => e.target.value && setDir(e.target.value)}
              className={cx('h-7 max-w-[190px] rounded-[5px] border bg-transparent px-1.5 text-[12px] outline-none', custom ? 'border-fg text-fg' : 'border-line text-faint hover:text-soft')}
            >
              <option value="" className="bg-surface">
                Otro destino
              </option>
              {places.map((p) => (
                <option key={p.dir} value={p.dir} className="bg-surface">
                  {shortDir(p.dir)} ({p.n})
                </option>
              ))}
            </select>
            {!item.analyzed && <span className="text-[11.5px] text-warn">No se pudo analizar el audio: elegí el destino a mano.</span>}
          </div>

          {item.neighbors.length > 0 && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
              Se parece a{' '}
              {item.neighbors.slice(0, 4).map((n, i) => (
                <span key={n.id}>
                  {i > 0 && ', '}
                  <button onClick={() => select(n.id)} className="text-soft underline-offset-2 hover:text-fg hover:underline">
                    {n.title}
                  </button>{' '}
                  <span className="text-ghost">({shortDir(n.dir)})</span>
                </span>
              ))}
            </p>
          )}
          {error && <p className="mt-2 text-[12px] text-warn">{error}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <select
            aria-label="Marcar para el set activo"
            title={`Al mover, lo suma al capítulo Candidatos de ${activeSet ? `“${activeSet.name}”` : 'un set nuevo'}`}
            value={forSet}
            onChange={(e) => setForSet(e.target.value as typeof forSet)}
            className={cx('h-7 rounded-[5px] border bg-transparent px-1.5 text-[12px] outline-none', forSet ? 'border-fg text-fg' : 'border-line text-faint hover:text-soft')}
          >
            <option value="" className="bg-surface">Sin set</option>
            <option value="candidate" className="bg-surface">Candidato</option>
            <option value="must" className="bg-surface">Sí o sí</option>
            <option value="open" className="bg-surface">Para abrir</option>
          </select>
          <Btn variant="solid" disabled={!dir || busy || !name.trim()} onClick={move} title="Mueve el archivo a ese cajón con este nombre">
            {busy ? 'Moviendo' : 'Mover'}
          </Btn>
          <Btn aria-label="Mandar a la Papelera" title="Mandar a la Papelera" onClick={discard}>
            <Trash2 size={12} />
          </Btn>
        </div>
      </div>
    </li>
  )
}

export function InboxPage() {
  const canPlay = useLibrary((s) => s.canPlay)
  const reload = useLibrary((s) => s.load)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [dir, setDir] = useState('')
  const [active, setActive] = useState(0)
  const [scan, setScan] = useState<{ busy: boolean; msg: string | null }>({ busy: false, msg: null })
  const [failed, setFailed] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    setFailed(null)
    try {
      const res = await fetch('/api/inbox')
      if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error()
      const data = await res.json()
      setPlaces(data.places)
      setDir(data.dir)
      const list: Row[] = data.files
      setRows(list)
      // de a uno: cada análisis decodifica el tema entero
      for (const f of list) {
        try {
          const r = await fetch(`/api/inbox/inspect?t=${f.token}`)
          const item = await r.json()
          setRows((cur) => cur?.map((x) => (x.token === f.token ? (r.ok ? { ...x, item } : { ...x, error: item.error }) : x)) ?? null)
        } catch {
          setRows((cur) => cur?.map((x) => (x.token === f.token ? { ...x, error: 'no se pudo analizar' } : x)) ?? null)
        }
      }
    } catch {
      setFailed('La bandeja solo funciona en la versión local.')
    }
  }, [])
  useEffect(() => {
    if (canPlay) load()
  }, [canPlay, load])

  const moved = rows?.filter((r) => r.done?.startsWith('Movido')).length ?? 0
  const pending = rows?.filter((r) => !r.done).length ?? 0

  const rescan = async () => {
    setScan({ busy: true, msg: 'Escaneando la biblioteca. Puede tardar un minuto.' })
    try {
      const { summary } = await post('/api/scan', {})
      await reload()
      setScan({ busy: false, msg: summary })
      load()
    } catch (e) {
      setScan({ busy: false, msg: e instanceof Error ? e.message : 'No se pudo escanear' })
    }
  }

  if (!canPlay || failed)
    return <p className="p-6 text-[13px] text-faint">{failed ?? 'La bandeja de descargas mueve archivos en tu disco, así que solo existe en la versión local.'}</p>

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center gap-3 px-5">
        <h1 className="text-[14px] font-medium text-fg">Bandeja</h1>
        <span className="num text-[12px] text-faint">{rows ? `${pending} por clasificar` : 'buscando'}</span>
        <span className="ml-auto flex items-center gap-2">
          {scan.msg && <span className="max-w-[420px] truncate text-[11.5px] text-faint">{scan.msg}</span>}
          <Btn onClick={load} title="Volver a mirar la carpeta de descargas">
            <RefreshCw size={12} />
          </Btn>
          <Btn variant={moved ? 'solid' : 'line'} disabled={scan.busy} onClick={rescan} title="Analiza los temas movidos y los suma a la biblioteca, el mapa y los consejos">
            {scan.busy ? 'Escaneando' : moved ? `Sumar ${moved} a la biblioteca` : 'Escanear biblioteca'}
          </Btn>
        </span>
      </header>
      <p className="max-w-[780px] shrink-0 px-5 pb-3 text-[12px] leading-relaxed text-faint">
        Temas de audio en <span className="num">{dir}</span>. Para cada uno se sugieren hasta tres cajones según a qué se parece de lo que ya tenés; el nombre se puede editar. Nada se
        mueve hasta que tocás Mover. Con una tarjeta elegida: 1, 2, 3 cambian el destino y Enter mueve. Después importalos en rekordbox para que analice la tonalidad.
      </p>
      <ul className="min-h-0 flex-1 overflow-y-auto border-t border-line">
        {rows?.length === 0 && <li className="px-5 py-10 text-[13px] text-faint">No hay temas de audio en la carpeta de descargas.</li>}
        {rows?.map((r, i) => (
          <Card
            key={r.token}
            row={r}
            places={places}
            active={i === active}
            onFocus={() => setActive(i)}
            onDone={(text) => {
              setRows((cur) => cur?.map((x) => (x.token === r.token ? { ...x, done: text } : x)) ?? null)
              setActive(i + 1)
            }}
          />
        ))}
      </ul>
    </div>
  )
}
