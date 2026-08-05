import { useMutation, useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AuditSummary } from '@/types/cv'

import {
  createJobResearchFromAudit,
  getJobResearchIntent,
  getJobResearchJobs,
} from '../api/job-research-api'
import type {
  JobIntentMatchResult,
  JobSearchIntent,
} from '../types/job-research.types'

interface JobSuggestionsPanelProps {
  audit: AuditSummary | null
}

export function JobSuggestionsPanel({ audit }: JobSuggestionsPanelProps) {
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null)
  const [intentId, setIntentId] = useState<string | null>(null)

  const createIntentMutation = useMutation({
    mutationFn: createJobResearchFromAudit,
    onSuccess: (response) => {
      setIntentId(response.intent.id)
    },
  })

  useEffect(() => {
    if (!audit?.audit_id || activeAuditId === audit.audit_id) {
      return
    }

    setActiveAuditId(audit.audit_id)
    setIntentId(null)
    createIntentMutation.mutate(audit.audit_id)
  }, [activeAuditId, audit?.audit_id, createIntentMutation])

  const intentQuery = useQuery({
    queryKey: ['job-research-intent', intentId],
    queryFn: () => getJobResearchIntent(intentId as string),
    enabled: Boolean(intentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status

      return status === 'queued' || status === 'processing' ? 3_000 : false
    },
  })

  const jobsQuery = useQuery({
    queryKey: ['job-research-jobs', intentId],
    queryFn: () => getJobResearchJobs(intentId as string),
    enabled: Boolean(intentId),
    refetchInterval: () =>
      intentQuery.data?.status === 'queued' ||
      intentQuery.data?.status === 'processing'
        ? 3_000
        : false,
  })

  if (!audit) {
    return (
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">Job suggestions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Matching jobs will appear after a CV audit completes.
        </CardContent>
      </Card>
    )
  }

  const intent = intentQuery.data
  const jobs = jobsQuery.data ?? []

  return (
    <Card className="rounded-md">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BriefcaseBusiness className="size-4" />
            Job suggestions
          </CardTitle>
          <ResearchStatusBadge
            isCreating={createIntentMutation.isPending}
            intent={intent}
          />
        </div>
        {intent ? (
          <div className="flex flex-wrap gap-2">
            {intent.runs.map((run) => (
              <Badge key={run.id} variant="outline">
                {run.source}: {run.status}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {createIntentMutation.isPending || intentQuery.isLoading ? (
          <JobSkeleton />
        ) : null}

        {createIntentMutation.isError || intentQuery.isError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Could not start job research from this CV audit.
          </p>
        ) : null}

        {intent?.error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {intent.error}
          </p>
        ) : null}

        {jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.map((match) => (
              <JobMatchCard key={match.job.id} match={match} />
            ))}
          </div>
        ) : null}

        {intent?.status === 'completed' && jobs.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            No matching jobs were saved for this intent yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ResearchStatusBadge({
  isCreating,
  intent,
}: {
  isCreating: boolean
  intent: JobSearchIntent | undefined
}) {
  if (isCreating || !intent) {
    return (
      <Badge variant="secondary">
        <Loader2 className="size-3 animate-spin" />
        queued
      </Badge>
    )
  }

  if (intent.status === 'failed') {
    return <Badge variant="destructive">failed</Badge>
  }

  return <Badge variant="secondary">{intent.status}</Badge>
}

function JobMatchCard({ match }: { match: JobIntentMatchResult }) {
  const job = match.job
  const sourceLabel = job.source === 'topcv' ? 'TopCV' : job.source

  return (
    <article className="space-y-3 rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold">{job.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {[job.companyName, job.locations.join(', '), job.salaryText]
              .filter(Boolean)
              .join(' • ') || sourceLabel}
          </p>
        </div>
        <Badge variant="outline">{match.match_score}</Badge>
      </div>

      {match.matched_terms.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {match.matched_terms.slice(0, 5).map((term) => (
            <Badge key={term} variant="secondary">
              {term}
            </Badge>
          ))}
        </div>
      ) : null}

      <a
        href={job.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        Open job
        <ExternalLink className="size-3" />
      </a>
    </article>
  )
}

function JobSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-md" />
      ))}
    </div>
  )
}
