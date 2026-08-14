import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { getAdminUsers } from '../api/admin-api'
export function useAdminUsers() {
  const [page, setPage] = useState(1); const [search, setSearchValue] = useState(''); const debouncedSearch = useDebouncedValue(search.trim())
  const query = useQuery({ queryKey: ['admin', 'users', page, debouncedSearch], queryFn: () => getAdminUsers({ page, search: debouncedSearch || undefined }), placeholderData: keepPreviousData })
  return { search, setSearch: (value: string) => { setSearchValue(value); setPage(1) }, page, setPage, users: query.data?.items ?? [], meta: query.data?.meta, isLoading: query.isLoading }
}
