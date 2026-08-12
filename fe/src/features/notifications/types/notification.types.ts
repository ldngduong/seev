export type NotificationStatus = 'running' | 'completed' | 'failed'

export interface UserNotification {
  id: string
  resourceType: 'cv_research_session' | 'job_fit_analysis'
  resourceId: string
  status: NotificationStatus
  title: string
  message: string
  href: string
  readAt: string | null
  occurredAt: string
  createdAt: string
  updatedAt: string
}

export interface NotificationPage {
  items: UserNotification[]
  meta: {
    page: number
    page_size: number
    total: number
    total_pages: number
    unread: number
  }
}
