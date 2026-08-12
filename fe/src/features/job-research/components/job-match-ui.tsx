import { cn } from '@/shared/lib/utils'

import type { JobSourceName } from '../types/job-research.types'

export const SOURCE_LABELS: Record<string, string> = {
  topcv: 'TopCV',
  vietnamworks: 'VietnamWorks',
  itviec: 'ITViec',
}

const SOURCE_DOT: Record<JobSourceName, string> = {
  topcv: 'bg-rose-500',
  vietnamworks: 'bg-sky-500',
  itviec: 'bg-emerald-500',
}

export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-zinc-600">
      <span
        className={cn(
          'size-1.5 rounded-full',
          SOURCE_DOT[source as JobSourceName] ?? 'bg-muted-foreground',
        )}
      />
      {SOURCE_LABELS[source] ?? source}
    </span>
  )
}

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
      {score}%
    </span>
  )
}

export function openJobPopup(url: string) {
  void window.open(url, '_blank', 'popup,width=960,height=720')
}

export function formatPostedAt(value: string | null) {
  if (!value) {
    return null
  }

  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)

  if (days <= 0) return 'Đăng hôm nay'
  if (days === 1) return 'Đăng hôm qua'
  if (days < 30) return `Đăng ${days} ngày trước`

  return `Đăng ngày ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))}`
}

export function CompanyLogo({
  logo,
  name,
  className,
}: {
  logo: string | null
  name: string | null
  className?: string
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        aria-hidden
        className={cn(
          'shrink-0 rounded-xl border border-border bg-white object-contain p-1',
          className,
        )}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/15 to-primary/5 font-heading font-semibold text-primary',
        className,
      )}
    >
      {(name ?? '?').trim().charAt(0).toUpperCase()}
    </span>
  )
}