import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UploadPhase } from '@/lib/api/client'
import { api } from '@/lib/api'
import { trackKeys } from './useTracks'

export function useImportXml() {
  return useMutation({
    mutationFn: (fileName: string) => api.importXml(fileName),
  })
}

/** Sube y analiza archivos de audio reales (ID3 + DSP) uno por uno. */
export function useUploadAudio(onPhase?: (file: string, phase: UploadPhase) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (files: File[]) => {
      const created: string[] = []
      const errors: { file: string; error: string }[] = []
      for (const file of files) {
        try {
          const track = await api.uploadAudioFile(file, (phase) => onPhase?.(file.name, phase))
          created.push(track.id)
        } catch (e) {
          errors.push({ file: file.name, error: (e as Error).message })
        }
      }
      return { created, errors }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackKeys.all })
      qc.invalidateQueries({ queryKey: trackKeys.stats })
    },
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
