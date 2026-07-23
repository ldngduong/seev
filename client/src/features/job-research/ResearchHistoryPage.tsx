import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, Clock3, FileText, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { listCvResearchSessions } from '@/services/cv-api'
import type { CvResearchSession } from '@/types/cv'

import { listJobResearchIntents } from './api/job-research-api'
import type { JobSearchIntent } from './types/job-research.types'

export function ResearchHistoryPage() {
  const intentsQuery = useQuery({
    queryKey: ['job-research-intents'],
    queryFn: () => listJobResearchIntents(50),
    refetchInterval: (query) =>
      query.state.data?.some((intent) =>
        ['queued', 'processing'].includes(intent.status),
      )
        ? 3_000
        : false,
  })
  const sessionsQuery = useQuery({
    queryKey: ['cv-research-sessions'],
    queryFn: () => listCvResearchSessions(50),
    refetchInterval: (query) =>
      query.state.data?.some((session) => session.status === 'processing')
        ? 3_000
        : false,
  })
  const isLoading = intentsQuery.isLoading || sessionsQuery.isLoading
  const isError = intentsQuery.isError || sessionsQuery.isError
  const isEmpty =
    !isLoading &&
    (sessionsQuery.data?.length ?? 0) === 0 &&
    (intentsQuery.data?.length ?? 0) === 0

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader
        title="Research history"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void sessionsQuery.refetch()
                void intentsQuery.refetch()
              }}
              disabled={intentsQuery.isFetching || sessionsQuery.isFetching}
            >
              <RefreshCw />
              Refresh
            </Button>
            <Link to="/research-cv" className={cn(buttonVariants())}>
              <FileText />
              New research
            </Link>
          </>
        }
      />

      {isLoading ? <HistorySkeleton /> : null}
      {isError ? (
        <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          Could not load research history.
        </div>
      ) : null}
      {isEmpty ? <EmptyHistory /> : null}

      {(sessionsQuery.data?.length ?? 0) > 0 ? (
        <HistorySection title="CV research sessions">
          {sessionsQuery.data?.map((session) => (
            <SessionHistoryItem key={session.id} session={session} />
          ))}
        </HistorySection>
      ) : null}

      {(intentsQuery.data?.length ?? 0) > 0 ? (
        <HistorySection title="Job research intents">
          {intentsQuery.data?.map((intent) => (
            <HistoryItem key={intent.id} intent={intent} />
          ))}
        </HistorySection>
      ) : null}
    </main>
  )
}

function HistorySection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold text-zinc-700">{title}</h2>
      {children}
    </section>
  )
}

function SessionHistoryItem({ session }: { session: CvResearchSession }) {
  const target =
    session.target.target_role ||
    [
      session.target.seniority_level_name,
      session.target.job_category_name,
    ]
      .filter(Boolean)
      .join(' ')
  const createdAt = formatDateTime(session.created_at)

  return (
    <article className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(session.status)}>
              {session.status}
            </Badge>
            <Badge variant="outline">
              {session.type}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3" />
              {createdAt}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-zinc-700">
              {target || 'AI inferred research'}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {session.cv.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {session.audit?.suggested_keywords.slice(0, 8).map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid min-w-[180px] gap-2 rounded-2xl bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Score</span>
            <strong>{session.audit?.overall_score ?? '-'}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Jobs</span>
            <strong>{session.job_suggestions.length}</strong>
          </div>
          <Link
            to={`/research-history/${session.id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            View detail
          </Link>
        </div>
      </div>
    </article>
  )
}

function HistoryItem({ intent }: { intent: JobSearchIntent }) {
  const target =
    intent.targetRole ||
    [intent.seniorityLevelName, intent.jobCategoryName]
      .filter(Boolean)
      .join(' ')
  const createdAt = formatDateTime(intent.createdAt)

  return (
    <article className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(intent.status)}>
              {intent.status}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3" />
              {createdAt}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-700">
              {target || 'Untitled research'}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {intent.keywords.slice(0, 8).join(', ') || 'No keywords'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {intent.runs.map((run) => (
              <Badge key={run.id} variant="outline">
                {run.source}: {run.status}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid min-w-[180px] gap-2 rounded-2xl bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Jobs saved</span>
            <strong>{intent.totalJobs}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Sources</span>
            <strong>
              {intent.completedSources.length}/{intent.requestedSources.length}
            </strong>
          </div>
        </div>
      </div>

      {intent.error ? (
        <p className="mt-3 rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {intent.error}
        </p>
      ) : null}
    </article>
  )
}

function HistorySkeleton() {
  return (
    <section className="grid gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-36 rounded-2xl" />
      ))}
    </section>
  )
}

function EmptyHistory() {
  return (
    <section className="grid min-h-[280px] place-items-center rounded-2xl bg-card p-8 text-center ring-1 ring-border">
      <div className="space-y-3">
        <BriefcaseBusiness className="mx-auto size-8 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-zinc-700">
          No research yet
        </h2>
        <p className="text-sm text-muted-foreground">
          Start with a CV audit. Seev will create a job-search intent from that
          target and keep the result here.
        </p>
        <Link to="/research-cv" className={cn(buttonVariants())}>
          Start CV research
        </Link>
      </div>
    </section>
  )
}

function getStatusVariant(status: JobSearchIntent['status'] | CvResearchSession['status']) {
  if (status === 'completed') {
    return 'default'
  }

  if (status === 'failed') {
    return 'destructive'
  }

  return 'secondary'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
