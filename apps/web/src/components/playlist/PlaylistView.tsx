import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Pencil, Trash2, X, ChevronUp, ChevronDown, ListMusic, Check } from 'lucide-react'
import type { PlaylistWithTracks } from '@serendipia/types'
import { Button } from '@/components/ui/Button'
import { Dropdown, MenuItem } from '@/components/ui/Dropdown'
import { EnergyDot } from '@/components/ui/EnergyBar'
import { Spinner } from '@/components/ui/Spinner'
import { useExportPlaylist, useRemoveTrackFromPlaylist, useReorderPlaylist, useUpdatePlaylist, useDeletePlaylist } from '@/hooks/usePlaylists'

export function PlaylistView({ playlist }: { playlist: PlaylistWithTracks }) {
  const navigate = useNavigate()
  const exportPl = useExportPlaylist()
  const removeTrack = useRemoveTrackFromPlaylist()
  const reorder = useReorderPlaylist()
  const update = useUpdatePlaylist()
  const del = useDeletePlaylist()

  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(playlist.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const move = (idx: number, dir: -1 | 1) => {
    const ids = playlist.tracks.map((t) => t.id)
    const j = idx + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    reorder.mutate({ playlistId: playlist.id, trackIds: next })
  }

  const saveName = async () => {
    if (name.trim() && name.trim() !== playlist.name) {
      await update.mutateAsync({ id: playlist.id, input: { name: name.trim() } })
    }
    setRenaming(false)
  }

  const onDelete = async () => {
    await del.mutateAsync(playlist.id)
    navigate('/')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-light">
          <ListMusic size={26} />
        </div>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="h-9 flex-1 rounded-lg border border-border bg-surface-raised px-3 text-lg font-semibold text-fg focus:border-primary focus:outline-none"
              />
              <Button size="sm" onClick={saveName}><Check size={14} /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setName(playlist.name); setRenaming(false) }}><X size={14} /></Button>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold text-fg">{playlist.name}</h1>
          )}
          {playlist.description && <p className="mt-1 text-sm text-fg-soft">{playlist.description}</p>}
          <p className="mt-2 font-mono text-[12px] text-fg-faint">
            {playlist.track_count} {playlist.track_count === 1 ? 'track' : 'tracks'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dropdown
            ariaLabel="Exportar"
            trigger={() => (
              <span className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:brightness-110 transition">
                <Download size={15} /> Exportar
              </span>
            )}
          >
            {(close) => (
              <>
                <MenuItem onClick={() => { exportPl.mutate({ id: playlist.id, format: 'xml' }); close() }}>
                  XML (Rekordbox)
                </MenuItem>
                <MenuItem onClick={() => { exportPl.mutate({ id: playlist.id, format: 'm3u' }); close() }}>
                  M3U (Serato)
                </MenuItem>
              </>
            )}
          </Dropdown>
          <Button variant="secondary" size="md" onClick={() => setRenaming(true)} aria-label="Renombrar"><Pencil size={15} /></Button>
          {confirmDelete ? (
            <Button variant="danger" size="md" onClick={onDelete} disabled={del.isPending}>
              {del.isPending ? <Spinner /> : <Trash2 size={15} />} Confirmar
            </Button>
          ) : (
            <Button variant="danger" size="md" onClick={() => setConfirmDelete(true)} aria-label="Eliminar"><Trash2 size={15} /></Button>
          )}
        </div>
      </div>

      {/* Tracks */}
      {playlist.tracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
          <p className="text-sm text-fg-soft">Esta playlist está vacía.</p>
          <p className="mt-1 text-[13px] text-fg-faint">
            Agregá tracks desde la biblioteca con el botón <span className="text-primary-light">+</span> en cualquier card.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          <div className="grid grid-cols-[32px_16px_minmax(0,2.4fr)_60px_44px_60px] items-center gap-3 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-fg-faint border-b border-border">
            <span>#</span>
            <span />
            <span>Título · Artista</span>
            <span>BPM</span>
            <span>Clave</span>
            <span />
          </div>
          {playlist.tracks.map((t, i) => (
            <div
              key={t.id}
              className="grid grid-cols-[32px_16px_minmax(0,2.4fr)_60px_44px_60px] items-center gap-3 px-4 h-12 border-b border-border last:border-b-0 hover:bg-surface-raised transition-colors group"
            >
              <span className="font-mono text-[12px] text-fg-faint tabular-nums">{t.position}</span>
              <EnergyDot energy={t.energy} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-fg">{t.title}</div>
                <div className="truncate text-[11px] text-fg-soft">{t.artist}</div>
              </div>
              <span className="font-mono text-[13px] text-fg tabular-nums">{t.bpm ?? '—'}</span>
              <span className="font-mono text-[13px] text-fg">{t.key_camelot ?? '—'}</span>
              <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconBtn label="Subir" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp size={14} /></IconBtn>
                <IconBtn label="Bajar" disabled={i === playlist.tracks.length - 1} onClick={() => move(i, 1)}><ChevronDown size={14} /></IconBtn>
                <IconBtn label="Quitar" onClick={() => removeTrack.mutate({ playlistId: playlist.id, trackId: t.id })}><X size={14} /></IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-fg-faint hover:bg-surface hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
    >
      {children}
    </button>
  )
}
