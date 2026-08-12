import { useQuery } from '@tanstack/react-query'
import { getUserDashboard } from '../api/dashboard-api'

export function useDashboard() {
  const query = useQuery({ queryKey: ['dashboard', 'me'], queryFn: getUserDashboard, refetchInterval: 15_000, refetchOnWindowFocus: true })
  return { dashboard: query.data, isLoading: query.isLoading, isError: query.isError }
}
