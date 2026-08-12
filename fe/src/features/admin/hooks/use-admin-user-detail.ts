import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { adjustUserCredits, getAdminUser } from '../api/admin-api'
export function useAdminUserDetail() {
  const { userId = '' } = useParams(); const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'user', userId], queryFn: () => getAdminUser(userId), enabled: Boolean(userId) })
  const mutation = useMutation({ mutationFn: (input: { amount: number; reason: string }) => adjustUserCredits(userId, { ...input, idempotencyKey: crypto.randomUUID() }), onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'user', userId] }) })
  return { detail: query.data, isLoading: query.isLoading, adjust: mutation.mutate, isAdjusting: mutation.isPending }
}
