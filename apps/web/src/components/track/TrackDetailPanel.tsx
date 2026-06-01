import { useState } from 'react'
import { Pencil, Trash2, Check, X, Plus, Play, Pause } from 'lucide-react'
import { SidePanel } from '@/components/ui/SidePanel'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Badge } from '@/components/ui/Badge'
import { EnergyBar } from '@/components/ui/EnergyBar'
import { Spinner } from '@/components/ui/Spinner'
import { Stars } from '@/components/ui/Stars'
import { CoverArt } from '@/components/ui/CoverArt'
import { Waveform } from '@/components/player/Waveform'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import { sourceBadge, formatDuration, formatDate, emotion } from '@/lib/format'
import { CAMELOT_TO_STANDARD, camelotColor } from '@/lib/camelot'
import { useTrack, useUpdateTrack, useDeleteTrack, useAddTag, useRemoveTag } from '@/hooks/useTracks'
import { useTrackPeaks } from '@/hooks/useTrackPeaks'
import { useUIStore } from '@/stores/ui'
import { usePlayerStore } from '@/stores/player'

export function TrackDetailPanel() {
  const panel = useUIStore((s) => s.panel)
  const close = useUIStore((s) => s.closePanel)
  const open = panel.type === 'detail'
  const { data: track, isLoading } = useTrack(open ? panel.trackId : undefined)

  const update = useUpdateTrack()
  const del = useDeleteTrack()
  const addTag = useAddTag()
  const removeTag = useRemoveTag()
  const { data: peaks } = useTrackPeaks(open ? panel.trackId : undefined)

  const currentTrackId = usePlayerStore((s) => s.currentTrackId)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const position = usePlayerStore((s) => s.position)
  const duration = usePlayerStore((s) => s.duration)
  const playTrack = usePlayerStore((s) => s.play)
  const togglePlay = usePlayerStore((s) => s.toggle)
  const seekRatio = usePlayerStore((s) => s.seekRatio)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ bpm: '', key: '', year: '', notes: '' })
  const [newTag, setNewTag] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const startEdit = () => {
    if (!track) return
    setForm({
      bpm: track.bpm?.toString() ?? '',
      key: track.key_camelot ?? '',
      year: track.year?.toString() ?? '',
      notes: track.notes ?? '',
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!track) return
    await update.mutateAsync({
      id: track.id,
      input: {
        bpm: form.bpm ? Number(form.bpm) : null,
        key_camelot: form.key || null,
        key_standard: form.key ? CAMELOT_TO_STANDARD[form.key] ?? null : null,
        year: form.year ? Number(form.year) : null,
        notes: form.notes || null,
      },
    })
    setEditing(false)
  }

  const onClose = () => { setEditing(false); setConfirmDelete(false); close() }

  const onDelete = async () => {
    if (!track) return
    await del.mutateAsync(track.id)
    onClose()
  }

  const badge = track ? sourceBadge(track.metadata_status, track.metadata_source) : null

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Detalle del track"
      footer={
        track && !editing ? (
          <div className="flex items-center gap-2">
            <AddToPlaylistMenu trackId={track.id} variant="button" />
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" size="sm" onClick={startEdit}><Pencil size={14} /> Editar</Button>
              {confirmDelete ? (
                <Button variant="danger" size="sm" onClick={onDelete} disabled={del.isPending}>
                  {del.isPending ? <Spinner /> : <Trash2 size={14} />} Confirmar
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /></Button>
              )}
            </div>
          </div>
        ) : editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEditing(false)}><X size={14} /> Cancelar</Button>
            <Button size="sm" className="flex-1" onClick={saveEdit} disabled={update.isPending}>
              {update.isPending ? <Spinner /> : <Check size={14} />} Guardar
            </Button>
          </div>
        ) : undefined
      }
    >
      {isLoading || !track ? (
        <div className="flex justify-center py-10"><Spinner className="w-6 h-6" /></div>
      ) : (
        <div className="space-y-5">
          {/* Cover + play */}
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <CoverArt id={track.id} url={track.cover_url} size={88} className="rounded-xl" />
              {track.audio_file_url && (
                <button
                  type="button"
                  aria-label={currentTrackId === track.id && isPlaying ? 'Pausar' : 'Reproducir'}
                  onClick={() =>
                    currentTrackId === track.id ? togglePlay() : playTrack(track.id, track.audio_file_url!)
                  }
                  className="absolute inset-0 m-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:opacity-100 cursor-pointer"
                >
                  {currentTrackId === track.id && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-[1px]" />}
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-fg leading-tight">{track.title}</h3>
                {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
              </div>
              <p className="text-sm text-fg-soft">{track.artist}</p>
              <div className="mt-2">
                <Stars rating={track.rating} size={17} onRate={(r) => update.mutate({ id: track.id, input: { rating: r } })} />
              </div>
            </div>
          </div>

          {/* Waveform (solo si hay archivo analizado) */}
          {peaks && peaks.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-raised/60 p-2.5">
              <Waveform
                peaks={peaks}
                height={56}
                progress={currentTrackId === track.id && duration > 0 ? position / duration : 0}
                onSeek={currentTrackId === track.id ? seekRatio : undefined}
              />
            </div>
          )}

          {/* Metadatos */}
          {editing ? (
            <div className="grid grid-cols-3 gap-3">
              <LabeledInput label="BPM" value={form.bpm} onChange={(v) => setForm({ ...form, bpm: v })} />
              <LabeledInput label="Clave" value={form.key} onChange={(v) => setForm({ ...form, key: v.toUpperCase() })} />
              <LabeledInput label="Año" value={form.year} onChange={(v) => setForm({ ...form, year: v })} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-surface-raised p-3 font-mono text-sm">
              <Stat label="BPM" value={track.bpm ?? '—'} />
              <Stat label="Clave" value={<span style={{ color: camelotColor(track.key_camelot) }}>{track.key_camelot ?? '—'}</span>} />
              <Stat label="Dance" value={track.danceability?.toFixed(2) ?? '—'} />
              <Stat label="Emoción" value={<span style={{ color: emotion(track.valence).color }}>{emotion(track.valence).arrow} {emotion(track.valence).label}</span>} />
              <Stat label="Duración" value={formatDuration(track.duration_ms)} />
              <Stat label="Año" value={track.year ?? '—'} />
              {track.format && <Stat label="Formato" value={`${track.format}${track.bitrate ? ` · ${track.bitrate}k` : ''}`} />}
              <Stat label="Subido" value={formatDate(track.created_at)} />
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-wide text-fg-faint">Energía</span>
            <EnergyBar energy={track.energy} />
          </div>

          {track.genre.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-faint">Género</span>
              <div className="flex flex-wrap gap-1.5">{track.genre.map((g) => <Chip key={g} tone="genre">{g}</Chip>)}</div>
            </div>
          )}

          {/* Tags editables */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-wide text-fg-faint">Etiquetas DJ</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {track.tags.map((t) => (
                <Chip key={t.id} tone={t.tag_type === 'custom' ? 'custom' : 'moment'} onRemove={() => removeTag.mutate({ trackId: track.id, tagId: t.id })}>
                  {t.tag}
                </Chip>
              ))}
              {track.tags.length === 0 && <span className="text-[12px] text-fg-faint">Sin etiquetas</span>}
            </div>
            <div className="flex gap-2">
              <input
                aria-label="Nueva etiqueta"
                placeholder="nueva etiqueta…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTag.trim()) {
                    addTag.mutate({ trackId: track.id, tag: newTag.trim().toLowerCase().replace(/\s+/g, '-') })
                    setNewTag('')
                  }
                }}
                className="h-8 flex-1 rounded-lg border border-border bg-surface-raised px-2.5 text-[13px] text-fg placeholder:text-fg-faint focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => {
                  if (newTag.trim()) {
                    addTag.mutate({ trackId: track.id, tag: newTag.trim().toLowerCase().replace(/\s+/g, '-') })
                    setNewTag('')
                  }
                }}
                aria-label="Agregar etiqueta"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-fg-soft hover:text-fg hover:border-border-strong cursor-pointer transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Notas */}
          {editing ? (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-faint">Notas</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-20 w-full resize-y rounded-lg border border-border bg-surface-raised p-2.5 text-[13px] text-fg focus:border-primary focus:outline-none"
              />
            </div>
          ) : track.notes ? (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wide text-fg-faint">Notas</span>
              <p className="text-[13px] text-fg-soft">{track.notes}</p>
            </div>
          ) : null}
        </div>
      )}
    </SidePanel>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="font-sans text-[11px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className="text-fg tabular-nums">{value}</div>
    </div>
  )
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="space-y-1 block">
      <span className="font-sans text-[11px] uppercase tracking-wide text-fg-faint">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-surface-raised px-2 font-mono text-sm text-fg focus:border-primary focus:outline-none"
      />
    </label>
  )
}
