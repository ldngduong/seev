import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CircleAlert, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { researchSocket } from '@/services/research-socket'
import { cn } from '@/lib/utils'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications-api'
import type { UserNotification } from '../types/notification.types'

const notificationQueryKey = ['notifications'] as const

export function NotificationCenter() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery({
    queryKey: notificationQueryKey,
    queryFn: getNotifications,
    staleTime: 30_000,
  })
  const readMutation = useMutation({ mutationFn: markNotificationRead })
  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKey }),
  })

  useEffect(() => {
    const handleNotification = () =>
      queryClient.invalidateQueries({ queryKey: notificationQueryKey })
    const handleConnect = () =>
      queryClient.invalidateQueries({ queryKey: notificationQueryKey })

    researchSocket.on('notification:updated', handleNotification)
    researchSocket.on('connect', handleConnect)
    researchSocket.connect()

    return () => {
      researchSocket.off('notification:updated', handleNotification)
      researchSocket.off('connect', handleConnect)
    }
  }, [queryClient])

  const items = notificationsQuery.data?.items ?? []
  const unread = notificationsQuery.data?.meta.unread ?? 0

  const openNotification = async (notification: UserNotification) => {
    if (!notification.readAt) {
      await readMutation.mutateAsync(notification.id)
      await queryClient.invalidateQueries({ queryKey: notificationQueryKey })
    }
    navigate(notification.href)
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Thông báo"
        className="relative grid size-9 place-items-center rounded-xl text-zinc-600 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 gap-0 overflow-hidden rounded-xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold text-zinc-700">Thông báo</p>
            <p className="text-xs text-muted-foreground">
              {unread ? `${unread} chưa đọc` : 'Bạn đã xem hết thông báo'}
            </p>
          </div>
          {unread ? (
            <button
              type="button"
              onClick={() => readAllMutation.mutate()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Đánh dấu đã đọc
            </button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {items.length ? (
            items.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                className={cn(
                  'flex w-full gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted',
                  !notification.readAt && 'bg-primary/5',
                )}
              >
                <NotificationIcon status={notification.status} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-700">
                    {notification.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                    {notification.message}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {formatRelativeTime(notification.updatedAt)}
                  </span>
                </span>
                {!notification.readAt ? (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Chưa có thông báo nào.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationIcon({ status }: { status: UserNotification['status'] }) {
  if (status === 'running') {
    return <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
  }
  if (status === 'failed') {
    return <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
  }
  return <Check className="mt-0.5 size-4 shrink-0 text-primary" />
}

function formatRelativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(elapsed / 60_000))
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}
