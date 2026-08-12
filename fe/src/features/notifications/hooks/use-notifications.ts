import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { researchSocket } from '@/features/cv-research/api/research-socket'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/features/notifications/api/notifications-api'
import type { UserNotification } from '@/features/notifications/types/notification.types'

const notificationQueryKey = ['notifications'] as const

export function useNotifications() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery({ queryKey: notificationQueryKey, queryFn: getNotifications, staleTime: 30_000 })
  const readMutation = useMutation({ mutationFn: markNotificationRead })
  const readAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKey }) })

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: notificationQueryKey })
    researchSocket.on('notification:updated', refresh)
    researchSocket.on('connect', refresh)
    researchSocket.connect()
    return () => { researchSocket.off('notification:updated', refresh); researchSocket.off('connect', refresh) }
  }, [queryClient])

  const openNotification = async (notification: UserNotification) => {
    if (!notification.readAt) {
      await readMutation.mutateAsync(notification.id)
      await queryClient.invalidateQueries({ queryKey: notificationQueryKey })
    }
    navigate(notification.href)
  }

  return {
    items: notificationsQuery.data?.items ?? [],
    unread: notificationsQuery.data?.meta.unread ?? 0,
    markAllRead: readAllMutation.mutate,
    openNotification,
  }
}
