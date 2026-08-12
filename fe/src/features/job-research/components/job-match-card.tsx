import {
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'

import type { JobIntentMatchResult } from '../types/job-research.types'
import {
  CompanyLogo,
  ScoreBadge,
  SourceBadge,
  formatPostedAt,
  openJobPopup,
} from './job-match-ui'

export function JobMatchCard({ match }: { match: JobIntentMatchResult }) {
  const {
    job,
    match_score: score,
    matched_terms: matchedTerms,
    match_reason: matchReason,
  } = match
  const isExpired = Boolean(job.expiredAt && new Date(job.expiredAt).getTime() <= Date.now())

  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <CompanyLogo logo={job.logo} name={job.companyName} className="size-11" />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-800">
              {job.title}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {[job.companyName, ...job.locations].filter(Boolean).join(' · ') || job.source}
            </p>
          </div>
          <ScoreBadge score={score} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {isExpired ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">Đã hết hạn</span> : null}
        {job.salaryText ? (
          <MetaChip icon={Banknote} className="bg-emerald-500/10 text-emerald-600">
            {job.salaryText}
          </MetaChip>
        ) : null}
        {job.jobType ? <MetaChip icon={BriefcaseBusiness}>{job.jobType}</MetaChip> : null}
        {job.level ? <MetaChip icon={BarChart3}>{job.level}</MetaChip> : null}
        {job.experience ? <MetaChip icon={Clock}>{job.experience}</MetaChip> : null}
        {job.locations.slice(0, 2).map((location) => (
          <MetaChip key={location} icon={MapPin}>{location}</MetaChip>
        ))}
        {formatPostedAt(job.postedAt) ? (
          <MetaChip icon={CalendarDays}>{formatPostedAt(job.postedAt)}</MetaChip>
        ) : null}
      </div>

      {matchedTerms.length > 0 || matchReason ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3.5" />
            Vì sao phù hợp
          </p>
          {matchReason ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
              {matchReason}
            </p>
          ) : null}
          {matchedTerms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matchedTerms.map((term) => (
                <span
                  key={term}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-zinc-600"
                >
                  {term}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-2.5">
        <SourceBadge source={job.source} />
        <button
          type="button"
          onClick={() => { if (!isExpired) openJobPopup(job.sourceUrl) }}
          disabled={isExpired}
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3.5 py-1.5',
            'text-xs font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
          )}
        >
          {isExpired ? 'Đã hết hạn' : 'Mở'}
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
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-xs text-zinc-600',
        className,
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  )
}
