import { Plus, Check, ListPlus } from 'lucide-react'
import { Dropdown, MenuItem } from '@/components/ui/Dropdown'
import { usePlaylists, useAddTrackToPlaylist } from '@/hooks/usePlaylists'
import { useUIStore } from '@/stores/ui'

interface Props {
  trackId: string
  /** estilo del trigger: icono (card/fila) o botón completo (detalle) */
  variant?: 'icon' | 'button'
}

export function AddToPlaylistMenu({ trackId, variant = 'icon' }: Props) {
  const { data: playlists } = usePlaylists()
  const addTrack = useAddTrackToPlaylist()
  const openNew = useUIStore((s) => s.setNewPlaylistOpen)

  return (
    <Dropdown
      ariaLabel="Agregar a playlist"
      trigger={() =>
        variant === 'icon' ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-md text-fg-faint hover:bg-surface-raised hover:text-fg transition-colors">
            <Plus size={16} />
          </span>
        ) : (
          <span className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-sm text-fg hover:border-border-strong transition-colors">
            <ListPlus size={15} /> Agregar a playlist
          </span>
        )
      }
    >
      {(close) => (
        <>
          {(playlists ?? []).map((p) => (
            <MenuItem
              key={p.id}
              onClick={() => {
                addTrack.mutate({ playlistId: p.id, trackId })
                close()
              }}
            >
              <Check size={13} className="opacity-0" />
              <span className="truncate">{p.name}</span>
            </MenuItem>
          ))}
          {(playlists ?? []).length > 0 && <div className="my-1 h-px bg-border" />}
          <MenuItem onClick={() => { openNew(true); close() }}>
            <Plus size={13} /> Nueva playlist…
          </MenuItem>
        </>
      )}
    </Dropdown>
  )
}
