import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { JobMatchDrawer } from './job-match-drawer'
import { CompanyLogo, ScoreBadge, SourceBadge } from './job-match-ui'
import type { JobIntentMatchResult, JobPost } from '../types/job-research.types'

export function JobMatchCard({ match }: { match: JobIntentMatchResult }) {
  const {
    job,
    match_score: score,
    matched_terms: matchedTerms,
    match_reason: matchReason,
  } = match

  return (
    <JobMatchCardInner
      job={job}
      score={score}
      matchedTerms={matchedTerms}
      matchReason={matchReason}
    />
  )
}

export function JobMatchCardInner({
  job,
  score,
  matchedTerms,
  matchReason,
}: {
  job: JobPost
  score: number
  matchedTerms: string[]
  matchReason?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full rounded-xl border bg-card p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-3">
          <CompanyLogo logo={job.logo} name={job.companyName} className="size-11" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                {job.title}
              </h3>
              <ScoreBadge score={score} />
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {[job.companyName, job.locations[0]].filter(Boolean).join(' · ') ||
                job.source}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <SourceBadge source={job.source} />
          {job.salaryText ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {job.salaryText}
            </span>
          ) : null}
          {job.skills.slice(0, 2).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {skill}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
            Details
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>

      <JobMatchDrawer
        open={open}
        onOpenChange={setOpen}
        job={job}
        score={score}
        matchedTerms={matchedTerms}
        matchReason={matchReason}
      />
    </>
  )
}