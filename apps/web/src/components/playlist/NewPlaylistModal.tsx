import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useCreatePlaylist } from '@/hooks/usePlaylists'
import { useUIStore } from '@/stores/ui'

export function NewPlaylistModal() {
  const open = useUIStore((s) => s.newPlaylistOpen)
  const setOpen = useUIStore((s) => s.setNewPlaylistOpen)
  const create = useCreatePlaylist()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const reset = () => { setName(''); setDescription(''); create.reset() }
  const onClose = () => { reset(); setOpen(false) }

  const onCreate = async () => {
    if (!name.trim()) return
    const pl = await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined })
    reset()
    setOpen(false)
    navigate(`/playlist/${pl.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva playlist" width="max-w-sm">
      <div className="space-y-4">
        <Input
          label="Nombre *"
          placeholder="Set Viernes Club"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onCreate()}
        />
        <Textarea
          label="Descripción"
          placeholder="(opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onCreate} disabled={!name.trim() || create.isPending}>
            {create.isPending ? <Spinner /> : null} Crear
          </Button>
        </div>
      </div>
    </Modal>
  )
}
