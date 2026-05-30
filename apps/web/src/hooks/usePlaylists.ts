import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExportFormat } from '@serendipia/types'
import { api } from '@/lib/api'
import { trackKeys } from './useTracks'

export const playlistKeys = {
  all: ['playlists'] as const,
  detail: (id: string) => ['playlist', id] as const,
}

export function usePlaylists() {
  return useQuery({ queryKey: playlistKeys.all, queryFn: () => api.listPlaylists() })
}

export function usePlaylist(id: string | undefined) {
  return useQuery({
    queryKey: id ? playlistKeys.detail(id) : ['playlist', 'none'],
    queryFn: () => api.getPlaylist(id!),
    enabled: !!id,
  })
}

export function useCreatePlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      api.createPlaylist(name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: playlistKeys.all }),
  })
}

export function useUpdatePlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; description?: string } }) =>
      api.updatePlaylist(id, input),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: playlistKeys.all })
      qc.invalidateQueries({ queryKey: playlistKeys.detail(p.id) })
    },
  })
}

export function useDeletePlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deletePlaylist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: playlistKeys.all }),
  })
}

export function useAddTrackToPlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: string; trackId: string }) =>
      api.addTrackToPlaylist(playlistId, trackId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: playlistKeys.all })
      qc.invalidateQueries({ queryKey: playlistKeys.detail(v.playlistId) })
    },
  })
}

export function useRemoveTrackFromPlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: string; trackId: string }) =>
      api.removeTrackFromPlaylist(playlistId, trackId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: playlistKeys.all })
      qc.invalidateQueries({ queryKey: playlistKeys.detail(v.playlistId) })
    },
  })
}

export function useReorderPlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ playlistId, trackIds }: { playlistId: string; trackIds: string[] }) =>
      api.reorderPlaylist(playlistId, trackIds),
    onSuccess: (p) => qc.setQueryData(playlistKeys.detail(p.id), p),
  })
}

export function useExportPlaylist() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: ExportFormat }) =>
      api.exportPlaylist(id, format),
    onSuccess: ({ filename, content }) => {
      const blob = new Blob([content], {
        type: filename.endsWith('.m3u') ? 'audio/x-mpegurl' : 'application/xml',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

// re-export para que el modal de import invalide tracks
export { trackKeys }
