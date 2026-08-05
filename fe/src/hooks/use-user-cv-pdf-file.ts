import { useQuery } from '@tanstack/react-query'

import { getUserCvFile } from '@/services/cv-api'

export function useUserCvPdfFile(cvId: string | null | undefined) {
  return useQuery({
    queryKey: ['user-cv-file', cvId],
    queryFn: () => getUserCvFile(cvId as string),
    enabled: Boolean(cvId),
    staleTime: 5 * 60_000,
  })
}
