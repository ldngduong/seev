import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
} from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import type { JobFeedItem } from '../types/job-feed.types'
import {
  formatJobType,
  isDisplayableSkill,
} from '../utils/job-feed.utils'
import {
  CompanyLogo,
  SourceBadge,
  formatPostedAt,
  openJobPopup,
} from './job-match-ui'

export function JobFeedCard({ job }: { job: JobFeedItem }) {
  const postedAt = formatPostedAt(job.postedAt)
  const visibleSkills = job.skills.filter(isDisplayableSkill).slice(0, 4)

  return (
    <article className="flex h-full min-h-64 flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <CompanyLogo logo={job.logo} name={job.companyName} className="size-11" />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-800">
            {job.title}
          </h2>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {job.companyName || 'Chưa cập nhật công ty'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {job.salaryText ? (
          <MetaChip icon={Banknote} className="bg-emerald-500/10 text-emerald-700">
            {job.salaryText}
          </MetaChip>
        ) : null}
        {job.jobType ? <MetaChip icon={BriefcaseBusiness}>{formatJobType(job.jobType)}</MetaChip> : null}
        {job.experience ? <MetaChip icon={Clock}>{job.experience}</MetaChip> : null}
        {postedAt ? <MetaChip icon={CalendarDays}>{postedAt}</MetaChip> : null}
      </div>

      {job.locations.length > 0 ? (
        <div className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span>{job.locations.join(' · ')}</span>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-sm font-medium text-zinc-700">
          {job.jobCategoryName || 'Chuyên môn CNTT'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {job.seniorityLevels.map((level) => (
            <span
              key={level.id}
              className="rounded-full bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {level.displayName}
            </span>
          ))}
          {visibleSkills.map((skill) => (
            <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs text-zinc-600">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3">
        <SourceBadge source={job.source} />
        <button
          type="button"
          onClick={() => openJobPopup(job.sourceUrl)}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700"
        >
          Xem việc làm
          <ExternalLink className="size-3" />
        </button>
      </div>
    </article>
  )
}

function MetaChip({
  icon: Icon,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-xs text-zinc-600', className)}>
      <Icon className="size-3" />
      {children}
    </span>
  )
}
