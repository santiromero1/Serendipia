import { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, FileCode, FileAudio, Loader2, AlertTriangle } from 'lucide-react'
import type { UploadPhase } from '@/lib/api/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useImportXml, useImportJob, useUploadAudio } from '@/hooks/useImport'
import { useUIStore } from '@/stores/ui'
import { cx } from '@/lib/format'

type Tab = 'audio' | 'xml'

const AUDIO_EXT = ['.mp3', '.flac', '.wav', '.aiff', '.aif', '.m4a', '.ogg']

const PHASE_LABEL: Record<UploadPhase, string> = {
  reading: 'Leyendo archivo…',
  parsing: 'Metadatos ID3…',
  decoding: 'Decodificando audio…',
  analyzing: 'Energía · danceability · tags (IA)…',
  waveform: 'Generando waveform…',
  saving: 'Guardando…',
  done: 'Listo',
}
const PHASE_ORDER: UploadPhase[] = ['reading', 'parsing', 'decoding', 'analyzing', 'waveform', 'saving', 'done']

export function ImportModal() {
  const open = useUIStore((s) => s.importOpen)
  const setOpen = useUIStore((s) => s.setImportOpen)
  const [tab, setTab] = useState<Tab>('audio')

  const onClose = () => setOpen(false)

  return (
    <Modal open={open} onClose={onClose} title="Importar tracks" width="max-w-lg">
      <div className="mb-5 flex gap-1 rounded-lg border border-border bg-surface-raised/60 p-1">
        <TabBtn active={tab === 'audio'} onClick={() => setTab('audio')}>
          <FileAudio size={14} /> Archivos de audio
        </TabBtn>
        <TabBtn active={tab === 'xml'} onClick={() => setTab('xml')}>
          <FileCode size={14} /> Rekordbox XML
        </TabBtn>
      </div>

      {tab === 'audio' ? <AudioTab onClose={onClose} /> : <XmlTab onClose={onClose} />}
    </Modal>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-medium transition-colors cursor-pointer',
        active ? 'bg-surface text-fg shadow-sm' : 'text-fg-soft hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Audio: análisis DSP real en el browser
// ─────────────────────────────────────────────────────────────
function AudioTab({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [phases, setPhases] = useState<Record<string, UploadPhase>>({})
  const [queue, setQueue] = useState<string[]>([])
  const upload = useUploadAudio((file, phase) => setPhases((p) => ({ ...p, [file]: phase })))

  const isAudio = (f: File) => AUDIO_EXT.some((ext) => f.name.toLowerCase().endsWith(ext))

  const start = (fileList: FileList | null) => {
    if (!fileList) return
    const files = Array.from(fileList).filter(isAudio)
    if (!files.length) return
    setQueue(files.map((f) => f.name))
    setPhases({})
    upload.mutate(files)
  }

  const result = upload.data
  const done = upload.isSuccess && !!result

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <CheckCircle2 size={40} className="mx-auto text-success" />
        <div>
          <h3 className="text-base font-semibold text-fg">Importación completada</h3>
          <p className="mt-1 text-sm text-fg-soft">
            <span className="font-mono">{result.created.length}</span> tracks analizados y agregados
          </p>
        </div>
        {result.errors.length > 0 && (
          <div className="mx-auto max-w-sm space-y-1 rounded-lg bg-amber/10 p-3 text-left text-[12px] text-amber">
            {result.errors.map((e) => (
              <p key={e.file} className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span className="truncate"><b>{e.file}</b>: {e.error === 'TRACK_DUPLICATE' ? 'ya está en tu biblioteca' : 'no se pudo analizar'}</span>
              </p>
            ))}
          </div>
        )}
        <Button className="w-full" onClick={onClose}>Ver mi biblioteca</Button>
      </div>
    )
  }

  if (upload.isPending) {
    return (
      <div className="space-y-2" aria-live="polite">
        <p className="text-[13px] text-fg-soft">Analizando {queue.length} {queue.length === 1 ? 'archivo' : 'archivos'} localmente…</p>
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {queue.map((name) => {
            const phase = phases[name]
            const idx = phase ? PHASE_ORDER.indexOf(phase) : -1
            const pct = idx >= 0 ? ((idx + 1) / PHASE_ORDER.length) * 100 : 4
            const finished = phase === 'done'
            return (
              <li key={name} className="rounded-lg border border-border bg-surface-raised/50 p-2.5">
                <div className="flex items-center gap-2">
                  {finished ? <CheckCircle2 size={14} className="shrink-0 text-success" /> : <Loader2 size={14} className="shrink-0 animate-spin text-primary-light" />}
                  <span className="min-w-0 flex-1 truncate text-[12px] text-fg">{name}</span>
                  <span className="shrink-0 text-[11px] text-fg-faint">{phase ? PHASE_LABEL[phase] : 'En cola…'}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); start(e.dataTransfer.files) }}
        className={cx(
          'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong',
        )}
      >
        <UploadCloud size={32} className="text-fg-faint" />
        <div>
          <p className="text-sm text-fg">Arrastrá tus archivos de audio</p>
          <p className="text-[13px] text-fg-faint">o hacé click para seleccionar</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={AUDIO_EXT.join(',')}
          multiple
          className="hidden"
          onChange={(e) => start(e.target.files)}
        />
      </div>
      <p className="text-[12px] text-fg-faint">
        MP3 · FLAC · WAV · AIFF · M4A. El análisis (BPM, waveform, energía) corre <span className="text-fg-soft">localmente en tu navegador</span> — nada se sube a un servidor.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// XML: importación Rekordbox (simulada)
// ─────────────────────────────────────────────────────────────
function XmlTab({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const importXml = useImportXml()
  const { data: job } = useImportJob(jobId)

  const start = async (name: string) => {
    setFileName(name)
    const res = await importXml.mutateAsync(name)
    setJobId(res.job_id)
  }
  const onFile = (file: File | undefined) => {
    if (!file || !file.name.toLowerCase().endsWith('.xml')) return
    void start(file.name)
  }

  const step = job?.status === 'completed' ? 'done' : jobId ? 'processing' : 'upload'

  if (step === 'done' && job) {
    return (
      <div className="space-y-5 text-center">
        <CheckCircle2 size={40} className="mx-auto text-success" />
        <div>
          <h3 className="text-base font-semibold text-fg">Importación completada</h3>
          <p className="mt-1 text-sm text-fg-soft"><span className="font-mono">{job.total}</span> tracks importados</p>
        </div>
        <div className="mx-auto max-w-xs space-y-1 text-left text-[13px] text-fg-soft">
          <p>├─ {job.enriched} enriquecidos vía GetSongBPM</p>
          <p>├─ {job.ai_inferred} inferidos por IA</p>
          <p>└─ 0 sin metadatos</p>
        </div>
        <Button className="w-full" onClick={onClose}>Ver mi biblioteca</Button>
      </div>
    )
  }

  if (step === 'processing' && job) {
    return (
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
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${job.total ? (job.processed / job.total) * 100 : 0}%` }} />
          </div>
        </div>
        <ul className="space-y-1 text-[13px]">
          <li className="text-green">✓ GetSongBPM: {job.enriched} tracks</li>
          <li className="text-amber">~ IA inferida: {job.ai_inferred} tracks</li>
          <li className="text-fg-faint">○ Pendiente: {Math.max(0, job.total - job.processed)} tracks</li>
        </ul>
      </div>
    )
  }

  return (
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
        <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <p className="text-[12px] text-fg-faint">
        En Rekordbox: <span className="text-fg-soft">File → Export Collection as XML</span>. (Demo: cualquier .xml dispara una importación simulada.)
      </p>
    </div>
  )
}
