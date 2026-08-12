import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { researchSocket } from '@/features/cv-research/api/research-socket'
import { getExternalJobResearch, retryExternalJobResearch } from '../api/external-job-research-api'
import type { ExternalJobResearch } from '../types/external-job-research.types'

export function useExternalJobResearch(id: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const handleProgress = (research: ExternalJobResearch) => {
      if (research.id !== id) return
      queryClient.setQueryData<ExternalJobResearch>(['external-job-research', id], (current) => ({ ...current, ...research, cv: current?.cv ?? research.cv }))
    }
    researchSocket.on('external-job-research:progress', handleProgress)
    researchSocket.connect()
    return () => { researchSocket.off('external-job-research:progress', handleProgress) }
  }, [id, queryClient])
  return useQuery({ queryKey: ['external-job-research', id], queryFn: () => getExternalJobResearch(id!), enabled: Boolean(id), refetchInterval: (query) => ['queued', 'processing'].includes(query.state.data?.status ?? '') ? 1500 : false })
}

export function useRetryExternalJobResearch(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: () => retryExternalJobResearch(id!), onSuccess: (data) => {
    queryClient.setQueryData(['external-job-research', id], data)
    void queryClient.invalidateQueries({ queryKey: ['external-job-researches'] })
    void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] })
  } })
}
