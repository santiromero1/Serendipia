import { useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { useLibrary } from '@/stores/library'
import { Btn, cx } from './bits'

/** Zona para soltar o elegir el XML de rekordbox. */
export function XmlDrop({ compact }: { compact?: boolean }) {
  const importXml = useLibrary((s) => s.importXml)
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<{ busy: boolean; msg: string | null; error: boolean }>({ busy: false, msg: null, error: false })
  const [over, setOver] = useState(false)

  const run = async (file: File | undefined) => {
    if (!file) return
    setState({ busy: true, msg: `Leyendo ${file.name}`, error: false })
    try {
      setState({ busy: false, msg: await importXml(file), error: false })
    } catch (e) {
      setState({ busy: false, msg: e instanceof Error ? e.message : 'No se pudo leer el archivo.', error: true })
    }
  }

  const picker = (
    <input ref={input} type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={(e) => run(e.target.files?.[0])} />
  )

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2">
        {picker}
        <Btn variant="line" disabled={state.busy} onClick={() => input.current?.click()}>
          <FileUp size={12} /> {state.busy ? 'Leyendo' : 'Actualizar XML'}
        </Btn>
        {state.msg && <span className={cx('text-[11.5px]', state.error ? 'text-warn' : 'text-faint')}>{state.msg}</span>}
      </span>
    )
  }

  return (
    <div>
      {picker}
      <button
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          run(e.dataTransfer.files?.[0])
        }}
        disabled={state.busy}
        className={cx(
          'flex w-full flex-col items-center gap-2 rounded-[8px] border border-dashed px-6 py-9 text-center transition-colors',
          over ? 'border-fg bg-raised' : 'border-line-strong hover:border-soft',
        )}
      >
        <FileUp size={20} strokeWidth={1.5} className="text-soft" />
        <span className="text-[13px] text-fg">{state.busy ? 'Leyendo la colección' : 'Soltá el XML de rekordbox o hacé clic para elegirlo'}</span>
        <span className="text-[11.5px] text-faint">Se lee en este navegador. No se sube a ningún servidor.</span>
      </button>
      {state.msg && <p className={cx('mt-3 text-[12px]', state.error ? 'text-warn' : 'text-soft')}>{state.msg}</p>}
    </div>
  )
}

export function Welcome() {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 grid h-8 w-8 place-items-center rounded-full border border-line-strong text-[12px] font-semibold text-fg">S</div>
        <h1 className="text-[22px] font-medium tracking-tight text-fg">Serendipia</h1>
        <p className="mt-2 max-w-[440px] text-[13.5px] leading-relaxed text-soft">
          Tu biblioteca de rekordbox como mapa, y un armador de sets por capítulos con tus reglas de tonalidad.
        </p>

        <div className="mt-8">
          <XmlDrop />
        </div>

        <ol className="mt-8 space-y-2 text-[12.5px] text-soft">
          <li className="flex gap-3">
            <span className="num text-faint">1</span>
            <span>
              En rekordbox: <span className="text-fg">Archivo › Exportar colección en formato xml</span>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="num text-faint">2</span>
            <span>Soltá ese archivo arriba. Trae tonalidades, BPM, estrellas, comentarios y tus playlists.</span>
          </li>
          <li className="flex gap-3">
            <span className="num text-faint">3</span>
            <span>Cuando sumes temas nuevos en rekordbox, exportá de nuevo y actualizá. Tus sets se conservan.</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
