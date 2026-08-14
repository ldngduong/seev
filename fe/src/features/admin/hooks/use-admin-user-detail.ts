import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { adjustUserCredits, getAdminUser, getAdminUserActivities, getAdminUserCreditHistory } from '../api/admin-api'
export function useAdminUserDetail() {
  const { userId = '' } = useParams(); const client = useQueryClient()
  const [creditPage, setCreditPage] = useState(1)
  const [activityPage, setActivityPage] = useState(1)
  const query = useQuery({ queryKey: ['admin', 'user', userId], queryFn: () => getAdminUser(userId), enabled: Boolean(userId) })
  const credits = useQuery({ queryKey: ['admin', 'user', userId, 'credit-history', creditPage], queryFn: () => getAdminUserCreditHistory(userId, creditPage), enabled: Boolean(userId) })
  const activities = useQuery({ queryKey: ['admin', 'user', userId, 'activities', activityPage], queryFn: () => getAdminUserActivities(userId, activityPage), enabled: Boolean(userId) })
  const mutation = useMutation({ mutationFn: (input: { amount: number; reason: string }) => adjustUserCredits(userId, { ...input, idempotencyKey: crypto.randomUUID() }), onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'user', userId] }) })
  return { detail: query.data, isLoading: query.isLoading, adjust: mutation.mutate, isAdjusting: mutation.isPending, creditHistory: credits.data, creditPage, setCreditPage, activities: activities.data, activityPage, setActivityPage }
}
