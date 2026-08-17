import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { getSeniorityLevels } from '@/entities/career-taxonomy/api/career-taxonomy-api'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

import { getJobFeed } from '../api/job-research-api'
import {
  createSeniorityOptions,
  JOB_FEED_PAGE_SIZE,
} from '../utils/job-feed.utils'

const FILTER_DEFAULTS = {
  page: '1',
  search: '',
  categoryId: 'all',
  seniorityLevelId: 'all',
  location: 'all',
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function readParam(params: URLSearchParams, key: string, fallback: string) {
  return params.get(key) ?? fallback
}

function isUsableParam(value: string) {
  return value !== '' && value !== 'all'
}

function isCategorySelection(value: string) {
  return UUID_PATTERN.test(value)
}

export function useJobFeed() {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = (() => {
    const raw = Number(readParam(searchParams, 'page', FILTER_DEFAULTS.page))
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
  })()
  const search = readParam(searchParams, 'q', FILTER_DEFAULTS.search)
  const categoryId = readParam(
    searchParams,
    'category',
    FILTER_DEFAULTS.categoryId,
  )
  const seniorityLevelId = readParam(
    searchParams,
    'seniority',
    FILTER_DEFAULTS.seniorityLevelId,
  )
  const location = readParam(
    searchParams,
    'location',
    FILTER_DEFAULTS.location,
  )
  const debouncedSearch = useDebouncedValue(search.trim())

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)

          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || !isUsableParam(value)) {
              next.delete(key)
            } else {
              next.set(key, value)
            }
          }
          if (patch.page === undefined) {
            next.delete('page')
          }

          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setSearch = useCallback(
    (value: string) => updateParams({ q: value }),
    [updateParams],
  )
  const setCategoryId = useCallback(
    (value: string) => updateParams({ category: value }),
    [updateParams],
  )
  const setSeniorityLevelId = useCallback(
    (value: string) => updateParams({ seniority: value }),
    [updateParams],
  )
  const setLocation = useCallback(
    (value: string) => updateParams({ location: value }),
    [updateParams],
  )
  const setPage = useCallback(
    (value: number) => updateParams({ page: String(value) }),
    [updateParams],
  )
  const reset = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const seniorityQuery = useQuery({
    queryKey: ['seniority-levels', 'feed', categoryId],
    queryFn: () =>
      getSeniorityLevels(
        isCategorySelection(categoryId) ? categoryId : undefined,
      ),
  })
  const seniorityOptions = useMemo(
    () => createSeniorityOptions(seniorityQuery.data ?? []),
    [seniorityQuery.data],
  )
  const feedQuery = useQuery({
    queryKey: [
      'job-feed',
      { page, search: debouncedSearch, categoryId, seniorityLevelId, location },
    ],
    queryFn: () =>
      getJobFeed({
        page,
        pageSize: JOB_FEED_PAGE_SIZE,
        search: debouncedSearch || undefined,
        categoryId:
          isCategorySelection(categoryId) ? categoryId : undefined,
        groupCode:
          categoryId !== FILTER_DEFAULTS.categoryId &&
          !isCategorySelection(categoryId)
            ? categoryId
            : undefined,
        seniorityLevelId:
          seniorityLevelId === FILTER_DEFAULTS.seniorityLevelId
            ? undefined
            : seniorityLevelId,
        location:
          location === FILTER_DEFAULTS.location ? undefined : location,
      }),
    placeholderData: keepPreviousData,
  })

  return {
    filters: {
      search,
      categoryId,
      seniorityLevelId,
      location,
      seniorityOptions,
      hasActiveFilters: Boolean(
        search.trim() ||
          categoryId !== FILTER_DEFAULTS.categoryId ||
          seniorityLevelId !== FILTER_DEFAULTS.seniorityLevelId ||
          location !== FILTER_DEFAULTS.location ||
          page > 1,
      ),
    },
    actions: {
      setSearch,
      setCategoryId,
      setSeniorityLevelId,
      setLocation,
      setPage,
      reset,
    },
    jobs: feedQuery.data?.items ?? [],
    meta: feedQuery.data?.meta,
    isLoading: feedQuery.isLoading,
    isError: feedQuery.isError,
  }
}
