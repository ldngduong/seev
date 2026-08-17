import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

import type { JobFeedResponse } from '@/features/job-research/types/job-feed.types'

import { saveJob, unsaveJob } from '../api/saved-jobs-api'

function updateSavedInFeedCache(
  queryClient: ReturnType<typeof useQueryClient>,
  jobId: string,
  saved: boolean,
) {
  queryClient.setQueriesData(
    { queryKey: ['job-feed'], type: 'active' },
    (old: JobFeedResponse | undefined) => {
      if (!old) return old

      const items = old.items.map((item) =>
        item.id === jobId ? { ...item, isSaved: saved } : item,
      )
      return items === old.items ? old : { ...old, items }
    },
  )
}

export function useSaveJob(jobId: string, isSaved: boolean) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(isSaved)

  useEffect(() => {
    setSaved(isSaved)
  }, [isSaved])

  const mutation = useMutation({
    mutationFn: () => (saved ? unsaveJob(jobId) : saveJob(jobId)),
    onSuccess: (data) => {
      setSaved(data.saved)
      updateSavedInFeedCache(queryClient, jobId, data.saved)
    },
    onError: () => setSaved(isSaved),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
    },
  })

  const toggle = useCallback(() => {
    if (!mutation.isPending) mutation.mutate()
  }, [mutation])

  return {
    saved,
    isPending: mutation.isPending,
    toggle,
  }
}