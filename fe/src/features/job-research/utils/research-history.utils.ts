import type { CvResearchSession } from '@/entities/cv/types/cv.types'

export function researchStatusVariant(status: CvResearchSession['status']) {
  if (status === 'completed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
  return 'secondary' as const
}

export function researchStatusLabel(status: CvResearchSession['status']) {
  return { queued: 'Đang chờ', processing: 'Đang xử lý', completed: 'Hoàn tất', failed: 'Thất bại' }[status]
}

export function formatResearchDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
