import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { researchSocket } from '@/features/cv-research/api/research-socket'
import { getJobFit, retryJobFit } from '../api/job-fit-api'
import type { JobFitAnalysis } from '../types/job-fit.types'

export function useJobFit(id: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const handleProgress = (analysis: JobFitAnalysis) => {
      if (analysis.id !== id) return
      queryClient.setQueryData<JobFitAnalysis>(['job-fit', id], (current) => ({
        ...current,
        ...analysis,
        cv: current?.cv ?? analysis.cv,
        job: {
          ...current?.job,
          ...analysis.job,
          seniority_levels: current?.job.seniority_levels ?? analysis.job.seniority_levels,
        },
      }))
    }
    researchSocket.on('job-fit:progress', handleProgress)
    researchSocket.connect()
    return () => { researchSocket.off('job-fit:progress', handleProgress) }
  }, [id, queryClient])
  return useQuery({
    queryKey: ['job-fit', id],
    queryFn: () => getJobFit(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => ['queued', 'processing'].includes(query.state.data?.status ?? '') ? 1500 : false,
  })
}

export function useRetryJobFit(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => retryJobFit(id!),
    onSuccess: (analysis) => {
      queryClient.setQueryData<JobFitAnalysis>(['job-fit', id], (current) => ({
        ...analysis,
        cv: current?.cv ?? analysis.cv,
        job: { ...current?.job, ...analysis.job },
      }))
      void queryClient.invalidateQueries({ queryKey: ['job-fits'] })
      void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] })
    },
  })
}
