import { useQuery } from '@tanstack/react-query'
import { getAdminDashboard, getExternalQuotas } from '../api/admin-api'
export function useAdminDashboard() {
  const dashboard = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: getAdminDashboard, refetchInterval: 30_000, refetchOnWindowFocus: true })
  const quotas = useQuery({ queryKey: ['admin', 'external-quotas'], queryFn: getExternalQuotas, refetchInterval: 60_000 })
  return { dashboard: dashboard.data, quotas: quotas.data?.providers ?? [], isLoading: dashboard.isLoading, refreshQuotas: quotas.refetch, isRefreshingQuotas: quotas.isFetching }
}
