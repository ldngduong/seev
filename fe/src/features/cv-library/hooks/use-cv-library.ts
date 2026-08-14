import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { listUserCvs, uploadUserCv } from '@/entities/cv/api/cv-api'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { toast } from 'sonner'

const PAGE_SIZE = 12

export function useCvLibrary() {
  const queryClient = useQueryClient()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearchValue] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { page, search: debouncedSearch }],
    queryFn: () => listUserCvs({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
    }),
    placeholderData: keepPreviousData,
  })
  const uploadMutation = useMutation({
    mutationFn: uploadUserCv,
    onSuccess: () => {
      toast.success('Đã thêm CV vào thư viện.')
      setIsUploadDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['user-cvs'] })
    },
  })

  const setSearch = (value: string) => {
    setSearchValue(value)
    setPage(1)
  }

  return {
    cvs: cvsQuery.data?.items ?? [],
    meta: cvsQuery.data?.meta,
    search,
    setSearch,
    setPage,
    isLoading: cvsQuery.isLoading,
    isError: cvsQuery.isError,
    isUploadDialogOpen,
    setIsUploadDialogOpen,
    uploadCv: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    isUploadError: uploadMutation.isError,
  }
}
