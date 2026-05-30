import { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, FileCode } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useImportXml, useImportJob } from '@/hooks/useImport'
import { useUIStore } from '@/stores/ui'
import { cx } from '@/lib/format'

export function ImportModal() {
  const open = useUIStore((s) => s.importOpen)
  const setOpen = useUIStore((s) => s.setImportOpen)
  const fileRef = useRef<HTMLInputElement>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const importXml = useImportXml()
  const { data: job } = useImportJob(jobId)

  const reset = () => { setJobId(null); setFileName(''); importXml.reset() }
  const onClose = () => { reset(); setOpen(false) }

  const start = async (name: string) => {
    setFileName(name)
    const res = await importXml.mutateAsync(name)
    setJobId(res.job_id)
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xml')) return
    void start(file.name)
  }

  const step = job?.status === 'completed' ? 'done' : jobId ? 'processing' : 'upload'

  return (
    <Modal open={open} onClose={onClose} title="Importar desde Rekordbox" width="max-w-lg">
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files[0]) }}
            className={cx(
              'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong',
            )}
          >
            <UploadCloud size={32} className="text-fg-faint" />
            <div>
              <p className="text-sm text-fg">Arrastrá tu archivo XML</p>
              <p className="text-[13px] text-fg-faint">o hacé click para seleccionar</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          <p className="text-[12px] text-fg-faint">
            En Rekordbox: <span className="text-fg-soft">File → Export Collection as XML</span>. (Demo: cualquier .xml dispara una importación simulada.)
          </p>
        </div>
      )}

      {step === 'processing' && job && (
        <div className="space-y-4" aria-live="polite">
          <div className="flex items-center gap-2 text-sm text-fg">
            <FileCode size={16} className="text-primary-light" />
            Encontramos <span className="font-mono">{job.total}</span> tracks en {fileName}
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-[12px] text-fg-soft">
              <span>Enriqueciendo metadatos…</span>
              <span className="font-mono tabular-nums">{job.processed} / {job.total}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${job.total ? (job.processed / job.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <ul className="space-y-1 text-[13px]">
            <li className="text-green">✓ GetSongBPM: {job.enriched} tracks</li>
            <li className="text-amber">~ IA inferida: {job.ai_inferred} tracks</li>
            <li className="text-fg-faint">○ Pendiente: {Math.max(0, job.total - job.processed)} tracks</li>
          </ul>
        </div>
      )}

      {step === 'done' && job && (
        <div className="space-y-5 text-center">
          <CheckCircle2 size={40} className="mx-auto text-success" />
          <div>
            <h3 className="text-base font-semibold text-fg">Importación completada</h3>
            <p className="mt-1 text-sm text-fg-soft">
              <span className="font-mono">{job.total}</span> tracks importados
            </p>
          </div>
          <div className="mx-auto max-w-xs space-y-1 text-left text-[13px] text-fg-soft">
            <p>├─ {job.enriched} enriquecidos vía GetSongBPM</p>
            <p>├─ {job.ai_inferred} inferidos por IA</p>
            <p>└─ 0 sin metadatos</p>
          </div>
          <Button className="w-full" onClick={onClose}>Ver mi biblioteca</Button>
        </div>
      )}
    </Modal>
  )
}
