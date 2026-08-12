import type { CvResearchSession } from '@/entities/cv/types/cv.types'

export function formatResearchTarget(session: CvResearchSession) {
  return session.target.target_role || [
    session.target.seniority_level_name,
    session.target.job_category_name,
  ].filter(Boolean).join(' ') || 'Research tự suy luận từ CV'
}

export function getResearchStatusVariant(status: CvResearchSession['status']) {
  if (status === 'completed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
  return 'secondary' as const
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
