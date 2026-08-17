import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

import { listSavedJobs } from '../api/saved-jobs-api'
import { SAVED_JOBS_PAGE_SIZE } from '../utils/saved-jobs.utils'

export function useSavedJobs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(
    1,
    Math.floor(Number(searchParams.get('page') ?? '1')) || 1,
  )
  const setPage = useCallback(
    (value: number) => {
      setSearchParams(value > 1 ? { page: String(value) } : {}, {
        replace: true,
      })
    },
    [setSearchParams],
  )
  const query = useQuery({
    queryKey: ['saved-jobs', { page }],
    queryFn: () => listSavedJobs(page, SAVED_JOBS_PAGE_SIZE),
    placeholderData: keepPreviousData,
  })

  return {
    jobs: query.data?.items ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    page,
    setPage,
  }
}