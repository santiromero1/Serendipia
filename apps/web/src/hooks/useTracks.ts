import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TrackFilters, CreateTrackInput, UpdateTrackInput } from '@serendipia/types'
import { api } from '@/lib/api'

export const trackKeys = {
  all: ['tracks'] as const,
  list: (f: TrackFilters) => ['tracks', f] as const,
  detail: (id: string) => ['track', id] as const,
  stats: ['stats'] as const,
}

export function useTracks(filters: TrackFilters) {
  return useQuery({
    queryKey: trackKeys.list(filters),
    queryFn: () => api.listTracks(filters),
  })
}

export function useTrack(id: string | undefined) {
  return useQuery({
    queryKey: id ? trackKeys.detail(id) : ['track', 'none'],
    queryFn: () => api.getTrack(id!),
    enabled: !!id,
  })
}

export function useLibraryStats() {
  return useQuery({ queryKey: trackKeys.stats, queryFn: () => api.libraryStats() })
}

export function usePreviewMetadata() {
  return useMutation({
    mutationFn: ({ title, artist }: { title: string; artist: string }) =>
      api.previewMetadata(title, artist),
  })
}

export function useCreateTrack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTrackInput) => api.createTrack(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackKeys.all })
      qc.invalidateQueries({ queryKey: trackKeys.stats })
    },
  })
}

export function useUpdateTrack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTrackInput }) =>
      api.updateTrack(id, input),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: trackKeys.all })
      qc.invalidateQueries({ queryKey: trackKeys.detail(t.id) })
    },
  })
}

export function useDeleteTrack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTrack(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackKeys.all })
      qc.invalidateQueries({ queryKey: trackKeys.stats })
    },
  })
}

export function useAddTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ trackId, tag }: { trackId: string; tag: string }) =>
      api.addTag(trackId, tag),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: trackKeys.all })
      qc.invalidateQueries({ queryKey: trackKeys.detail(v.trackId) })
    },
  })
}

export function useRemoveTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ trackId, tagId }: { trackId: string; tagId: string }) =>
      api.removeTag(trackId, tagId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: trackKeys.all })
      qc.invalidateQueries({ queryKey: trackKeys.detail(v.trackId) })
    },
  })
}
