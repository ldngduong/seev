import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'

import { getApiErrorMessage } from '@/shared/lib/api-error'

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => toast.error(getApiErrorMessage(error, 'Không tải được dữ liệu. Vui lòng thử lại.')),
        }),
        mutationCache: new MutationCache({
          onError: (error) => toast.error(getApiErrorMessage(error)),
        }),
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
