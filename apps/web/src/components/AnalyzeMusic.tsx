import { useRef } from 'react'
import { AudioLines } from 'lucide-react'
import { useLibrary } from '@/stores/library'
import { Btn, cx } from './bits'

/**
 * Elegir la carpeta de música para analizarla en el navegador.
 * El audio no se sube: se lee del disco, se calcula la huella de cada tema y eso es lo único que se guarda.
 */
export function AnalyzeMusic({ big }: { big?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const analysis = useLibrary((s) => s.analysis)
  const analyze = useLibrary((s) => s.analyzeFolder)
  const cancel = useLibrary((s) => s.cancelAnalysis)
  const hasServer = useLibrary((s) => s.hasServer)
  const hasSound = useLibrary((s) => (s.lib?.clusters?.length ?? 0) > 0)
  if (hasServer) return null

  const status = !analysis
    ? null
    : analysis.error
      ? analysis.error
      : analysis.running
        ? analysis.phase === 'modelo'
          ? 'Cargando el modelo de sonido (18 MB, una sola vez)'
          : analysis.phase === 'mapa'
            ? 'Armando el mapa'
            : `${analysis.done} de ${analysis.total} · ${analysis.current}`
        : `Listo: ${analysis.done - analysis.failed} temas analizados${analysis.failed ? `, ${analysis.failed} no se pudieron leer` : ''}. Ya podés escucharlos acá.`

  return (
    <span className={cx('inline-flex min-w-0 items-center gap-2', big && 'flex-col items-start gap-3')}>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        // @ts-expect-error atributo no estándar para elegir una carpeta entera
        webkitdirectory=""
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (files.length) analyze(files)
        }}
      />
      {analysis?.running ? (
        <Btn variant="line" onClick={cancel}>
          Detener
        </Btn>
      ) : (
        <Btn variant={big ? 'solid' : 'line'} onClick={() => input.current?.click()} title="El audio no se sube: se analiza en este navegador">
          <AudioLines size={12} /> {hasSound ? 'Analizar temas nuevos' : 'Analizar mi música'}
        </Btn>
      )}
      {status && <span className={cx('truncate text-[11.5px]', analysis?.error ? 'text-warn' : 'text-faint', !big && 'max-w-[340px]')}>{status}</span>}
      {analysis?.running && analysis.phase === 'temas' && (
        <span className="h-[3px] w-24 shrink-0 rounded-full bg-line">
          <span className="block h-full rounded-full bg-fg" style={{ width: `${(analysis.done / Math.max(1, analysis.total)) * 100}%` }} />
        </span>
      )}
    </span>
  )
}
