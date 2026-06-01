import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTrackPeaks(trackId: string | undefined) {
  return useQuery({
    queryKey: trackId ? ['track-peaks', trackId] : ['track-peaks', 'none'],
    queryFn: () => api.getTrackPeaks(trackId!),
    enabled: !!trackId,
    staleTime: Infinity,
  })
}
