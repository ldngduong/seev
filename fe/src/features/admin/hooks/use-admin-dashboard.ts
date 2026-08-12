import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getAdminDashboard, getExternalQuotas, getNewAccountCredits, updateNewAccountCredits } from '../api/admin-api'
export function useAdminDashboard() {
  const queryClient = useQueryClient()
  const dashboard = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: getAdminDashboard, refetchInterval: 30_000, refetchOnWindowFocus: true })
  const quotas = useQuery({ queryKey: ['admin', 'external-quotas'], queryFn: getExternalQuotas, refetchInterval: 60_000 })
  const newAccountCredits = useQuery({ queryKey: ['admin', 'settings', 'new-account-credits'], queryFn: getNewAccountCredits })
  const updateCredits = useMutation({
    mutationFn: updateNewAccountCredits,
    onSuccess: (setting) => {
      queryClient.setQueryData(['admin', 'settings', 'new-account-credits'], setting)
      toast.success('Đã cập nhật credit cho tài khoản mới.')
    },
  })
  return {
    dashboard: dashboard.data,
    quotas: quotas.data?.providers ?? [],
    newAccountCredits: newAccountCredits.data,
    isLoading: dashboard.isLoading,
    refreshQuotas: quotas.refetch,
    isRefreshingQuotas: quotas.isFetching,
    saveNewAccountCredits: updateCredits.mutateAsync,
    isSavingNewAccountCredits: updateCredits.isPending,
  }
}
