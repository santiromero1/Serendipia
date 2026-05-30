import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { trackKeys } from './useTracks'

export function useImportXml() {
  return useMutation({
    mutationFn: (fileName: string) => api.importXml(fileName),
  })
}

/** Polling del job cada 1s (2-technical.md: cada 2s; acá 1s para feedback ágil). */
export function useImportJob(jobId: string | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['import-job', jobId],
    queryFn: async () => {
      const job = await api.getImportJob(jobId!)
      if (job.status === 'completed') {
        qc.invalidateQueries({ queryKey: trackKeys.all })
        qc.invalidateQueries({ queryKey: trackKeys.stats })
      }
      return job
    },
    enabled: !!jobId,
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 1000 : false),
  })
}
