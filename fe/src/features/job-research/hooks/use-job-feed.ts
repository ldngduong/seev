import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { getSeniorityLevels } from '@/entities/career-taxonomy/api/career-taxonomy-api'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

import { getJobFeed } from '../api/job-research-api'
import {
  createSeniorityOptions,
  JOB_FEED_PAGE_SIZE,
} from '../utils/job-feed.utils'

export function useJobFeed() {
  const [page, setPage] = useState(1)
  const [search, setSearchValue] = useState('')
  const [categoryId, setCategoryIdValue] = useState('all')
  const [seniorityLevelId, setSeniorityLevelIdValue] = useState('all')
  const debouncedSearch = useDebouncedValue(search.trim())

  const seniorityQuery = useQuery({
    queryKey: ['seniority-levels', 'feed', categoryId],
    queryFn: () =>
      getSeniorityLevels(categoryId === 'all' ? undefined : categoryId),
  })
  const seniorityOptions = useMemo(
    () => createSeniorityOptions(seniorityQuery.data ?? []),
    [seniorityQuery.data],
  )
  const feedQuery = useQuery({
    queryKey: [
      'job-feed',
      { page, search: debouncedSearch, categoryId, seniorityLevelId },
    ],
    queryFn: () =>
      getJobFeed({
        page,
        pageSize: JOB_FEED_PAGE_SIZE,
        search: debouncedSearch || undefined,
        categoryId: categoryId === 'all' ? undefined : categoryId,
        seniorityLevelId:
          seniorityLevelId === 'all' ? undefined : seniorityLevelId,
      }),
    placeholderData: keepPreviousData,
  })

  const setSearch = useCallback((value: string) => {
    setSearchValue(value)
    setPage(1)
  }, [])
  const setCategoryId = useCallback((value: string) => {
    setCategoryIdValue(value)
    setPage(1)
  }, [])
  const setSeniorityLevelId = useCallback((value: string) => {
    setSeniorityLevelIdValue(value)
    setPage(1)
  }, [])

  return {
    filters: {
      search,
      categoryId,
      seniorityLevelId,
      seniorityOptions,
    },
    actions: {
      setSearch,
      setCategoryId,
      setSeniorityLevelId,
      setPage,
    },
    jobs: feedQuery.data?.items ?? [],
    meta: feedQuery.data?.meta,
    isLoading: feedQuery.isLoading,
    isError: feedQuery.isError,
  }
}
