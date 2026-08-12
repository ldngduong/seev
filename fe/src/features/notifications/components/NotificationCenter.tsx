import { Bell, Check, CircleAlert, LoaderCircle } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { useNotifications } from '@/features/notifications/hooks/use-notifications'
import { cn } from '@/shared/lib/utils'
import type { UserNotification } from '../types/notification.types'

export function NotificationCenter() {
  const notifications = useNotifications()
  const { items, unread } = notifications

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
      <PopoverContent align="end" sideOffset={8} className="w-[min(20rem,calc(100vw-1rem))] gap-0 overflow-hidden rounded-xl p-0">
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
              onClick={() => notifications.markAllRead()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Đánh dấu đã đọc
            </button>
          ) : null}
        </div>
        <div className="flex max-h-96 flex-col gap-1 overflow-y-auto p-2">
          {items.length ? (
            items.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void notifications.openNotification(notification)}
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
                    {formatRelativeTime(notification.occurredAt)}
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
