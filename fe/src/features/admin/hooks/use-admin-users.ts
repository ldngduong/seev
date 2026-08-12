import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { getAdminUsers } from '../api/admin-api'
export function useAdminUsers() {
  const [page, setPage] = useState(1); const [search, setSearchValue] = useState(''); const deferred = useDeferredValue(search.trim())
  const query = useQuery({ queryKey: ['admin', 'users', page, deferred], queryFn: () => getAdminUsers({ page, search: deferred || undefined }), placeholderData: keepPreviousData })
  return { search, setSearch: (value: string) => { setSearchValue(value); setPage(1) }, page, setPage, users: query.data?.items ?? [], meta: query.data?.meta, isLoading: query.isLoading }
}
