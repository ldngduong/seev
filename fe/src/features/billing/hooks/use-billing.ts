import { useQuery } from '@tanstack/react-query'
import { getBillingAccount, getBillingCatalog } from '../api/billing-api'
export function useBilling() {
  const account = useQuery({ queryKey: ['billing', 'account'], queryFn: getBillingAccount })
  const catalog = useQuery({ queryKey: ['billing', 'catalog'], queryFn: getBillingCatalog, staleTime: 60_000 })
  return { balance: account.data?.balance ?? null, products: catalog.data ?? [], isLoading: account.isLoading || catalog.isLoading }
}
