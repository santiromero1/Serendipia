import { useState } from 'react'
import { Search, Check, Sparkles } from 'lucide-react'
import { SidePanel } from '@/components/ui/SidePanel'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { EnergyBar } from '@/components/ui/EnergyBar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { sourceBadge } from '@/lib/format'
import { usePreviewMetadata, useCreateTrack } from '@/hooks/useTracks'
import { useUIStore } from '@/stores/ui'

export function AddTrackPanel() {
  const open = useUIStore((s) => s.panel.type === 'add')
  const close = useUIStore((s) => s.closePanel)
  const openDetail = useUIStore((s) => s.openTrackDetail)

  const [artist, setArtist] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const preview = usePreviewMetadata()
  const create = useCreateTrack()
  const meta = preview.data

  const reset = () => {
    setArtist(''); setTitle(''); setNotes(''); setError(null)
    preview.reset(); create.reset()
  }

  const onClose = () => { reset(); close() }

  const onSearch = () => {
    setError(null)
    if (!artist.trim() || !title.trim()) return
    preview.mutate({ title: title.trim(), artist: artist.trim() })
  }

  const onSave = async () => {
    setError(null)
    try {
      const track = await create.mutateAsync({ title: title.trim(), artist: artist.trim(), notes: notes.trim() || undefined })
      reset()
      openDetail(track.id)
    } catch (e) {
      setError((e as Error).message === 'TRACK_DUPLICATE'
        ? 'Ese track ya está en tu biblioteca.'
        : 'No se pudo guardar el track.')
    }
  }

  const badge = meta ? sourceBadge(meta.metadata_status, meta.metadata_source) : null

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Agregar Track"
      footer={
        meta ? (
          <Button className="w-full" onClick={onSave} disabled={create.isPending}>
            {create.isPending ? <Spinner /> : <Check size={16} />} Guardar en biblioteca
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <Input label="Artista *" placeholder="Zombie Nation" value={artist} onChange={(e) => setArtist(e.target.value)} />
        <Input label="Título *" placeholder="Kernkraft 400" value={title} onChange={(e) => setTitle(e.target.value)} />

        <Button
          variant="secondary"
          className="w-full"
          onClick={onSearch}
          disabled={!artist.trim() || !title.trim() || preview.isPending}
        >
          {preview.isPending ? <Spinner /> : <Search size={16} />} Buscar metadatos
        </Button>

        {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-[13px] text-error">{error}</p>}

        {preview.isPending && (
          <p className="flex items-center gap-2 text-[13px] text-fg-faint">
            <Sparkles size={14} /> Consultando Spotify · GetSongBPM…
          </p>
        )}

        {meta && (
          <div className="space-y-4 rounded-xl border border-border bg-surface-raised p-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-fg">Resultado</span>
              {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-sm">
              <Field label="BPM" value={meta.bpm ?? '—'} />
              <Field label="Clave" value={meta.key_camelot ?? '—'} />
              <Field label="Año" value={meta.year ?? '—'} />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-faint">Energía</span>
              <EnergyBar energy={meta.energy} />
            </div>

            {meta.genre.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {meta.genre.map((g) => <Chip key={g} tone="genre">{g}</Chip>)}
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-faint">Etiquetas DJ (IA)</span>
              <div className="flex flex-wrap gap-1.5">
                {meta.tags.map((t) => <Chip key={t} tone="moment">{t}</Chip>)}
              </div>
            </div>

            <Textarea label="Notas personales" placeholder="Funciona perfecto en el peak…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        )}
      </div>
    </SidePanel>
  )
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-fg-faint font-sans">{label}</div>
      <div className="text-fg tabular-nums">{value}</div>
    </div>
  )
}
