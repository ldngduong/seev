import { cn } from '@/lib/utils'

import type { JobSourceName } from '../types/job-research.types'

export const SOURCE_LABELS: Record<string, string> = {
  topcv: 'TopCV',
  vietnamworks: 'VietnamWorks',
  indeed: 'Indeed',
  topdev: 'TopDev',
  itviec: 'ITViec',
  jobsgo: 'JobsGo',
  viecoi: 'ViecOi',
}

const SOURCE_DOT: Record<JobSourceName, string> = {
  topcv: 'bg-rose-500',
  vietnamworks: 'bg-sky-500',
  indeed: 'bg-indigo-500',
  topdev: 'bg-violet-500',
  itviec: 'bg-emerald-500',
  jobsgo: 'bg-teal-500',
  viecoi: 'bg-orange-500',
}

export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
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