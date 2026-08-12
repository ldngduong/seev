import { apiClient } from '@/shared/lib/api-client'

import type {
  NotificationPage,
  UserNotification,
} from '../types/notification.types'

export async function getNotifications() {
  const response = await apiClient.get<NotificationPage>('/notifications', {
    params: { page: 1, pageSize: 12 },
  })
  return response.data
}

export async function markNotificationRead(id: string) {
  const response = await apiClient.patch<UserNotification>(
    `/notifications/${id}/read`,
  )
  return response.data
}

export async function markAllNotificationsRead() {
  await apiClient.patch('/notifications/read-all')
}
