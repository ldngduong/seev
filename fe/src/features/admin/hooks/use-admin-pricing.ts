import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getServices, updateServicePrice } from '../api/admin-api'
export function useAdminPricing() {
  const client = useQueryClient(); const query = useQuery({ queryKey: ['admin', 'services'], queryFn: getServices })
  const mutation = useMutation({ mutationFn: ({ id, price }: { id: string; price: number }) => updateServicePrice(id, price), onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'services'] }) })
  return { services: query.data ?? [], isLoading: query.isLoading, updatePrice: mutation.mutate, isUpdating: mutation.isPending }
}
