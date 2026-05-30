import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PlaylistView } from '@/components/playlist/PlaylistView'
import { Spinner } from '@/components/ui/Spinner'
import { usePlaylist } from '@/hooks/usePlaylists'

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = usePlaylist(id)

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-fg-soft hover:text-fg transition-colors">
          <ArrowLeft size={14} /> Volver a la biblioteca
        </Link>
        <p className="text-sm text-fg-soft">No encontramos esta playlist.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-fg-soft hover:text-fg transition-colors">
        <ArrowLeft size={14} /> Biblioteca
      </Link>
      <PlaylistView playlist={data} />
    </div>
  )
}
