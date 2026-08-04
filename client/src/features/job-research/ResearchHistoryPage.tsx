import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BriefcaseBusiness, Clock3, FileText, RefreshCw, Search } from 'lucide-react'
import { useCallback, useDeferredValue, useState } from 'react'
import { Link } from 'react-router'

import { DataPagination } from '@/components/data/DataPagination'
import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useResearchProgress } from '@/hooks/use-research-progress'
import { cn } from '@/lib/utils'
import {
  listCvResearchSessions,
  listUserCvs,
  MAX_CV_PAGE_SIZE,
  retryCvResearchSession,
  type PaginatedResponse,
} from '@/services/cv-api'
import type { CvResearchSession } from '@/types/cv'

const PAGE_SIZE = 10

export function ResearchHistoryPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [cvId, setCvId] = useState('all')
  const deferredSearch = useDeferredValue(search.trim())
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { page: 1, purpose: 'research-history-filter' }],
    queryFn: () => listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE }),
  })
  const queryKey = [
    'cv-research-sessions',
    { page, search: deferredSearch, status, type, cvId },
  ] as const
  const sessionsQuery = useQuery({
    queryKey,
    queryFn: () =>
      listCvResearchSessions({
        page,
        pageSize: PAGE_SIZE,
        search: deferredSearch || undefined,
        status: status === 'all' ? undefined : status,
        type: type === 'all' ? undefined : (type as 'quick' | 'custom'),
        userCvId: cvId === 'all' ? undefined : cvId,
      }),
    placeholderData: keepPreviousData,
  })
  const retryMutation = useMutation({
    mutationFn: retryCvResearchSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] }),
  })
  const handleProgress = useCallback(
    (event: import('@/types/research-progress').ResearchProgressEvent) => {
      queryClient.setQueriesData<PaginatedResponse<CvResearchSession>>(
        { queryKey: ['cv-research-sessions'] },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === event.session_id
                    ? {
                        ...item,
                        status: event.status,
                        phase: event.phase,
                        progress: event.progress,
                        progress_message: event.message,
                        attempt: event.attempt,
                        error: event.error,
                        updated_at: event.updated_at,
                      }
                    : item,
                ),
              }
            : current,
      )
      if (['completed', 'failed'].includes(event.status)) {
        void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
      }
    },
    [queryClient],
  )
  useResearchProgress(handleProgress, () => {
    void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
  })

  const sessions = sessionsQuery.data?.items ?? []
  const meta = sessionsQuery.data?.meta

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader
        title="Research history"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void sessionsQuery.refetch()}
              disabled={sessionsQuery.isFetching}
            >
              <RefreshCw />
              Refresh
            </Button>
            <Link to="/research/new" className={cn(buttonVariants())}>
              <FileText />
              New research
            </Link>
          </>
        }
      />

      <section className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by CV or target role"
              className="pl-9"
            />
          </label>
          <Select
            value={cvId}
            onValueChange={(value) => {
              setCvId(value ?? 'all')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full border-border bg-background sm:w-64" aria-label="Filter by CV">
              <SelectValue placeholder="All CVs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All CVs</SelectItem>
              {(cvsQuery.data?.items ?? []).map((cv) => (
                <SelectItem key={cv.id} value={cv.id}>{cv.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value ?? 'all')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full border-border bg-background sm:w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="processing">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value ?? 'all')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full border-border bg-background sm:w-52" aria-label="Filter by research type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All research types</SelectItem>
              <SelectItem value="quick">Quick research</SelectItem>
              <SelectItem value="custom">Custom research</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sessionsQuery.isLoading ? <HistorySkeleton /> : null}
        {sessionsQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Could not load research history.
          </div>
        ) : null}
        {!sessionsQuery.isLoading && !sessions.length ? <EmptyHistory /> : null}
        {sessions.map((session) => (
          <SessionHistoryItem
            key={session.id}
            session={session}
            isRetrying={retryMutation.isPending && retryMutation.variables === session.id}
            onRetry={() => retryMutation.mutate(session.id)}
          />
        ))}
        {meta ? (
          <DataPagination
            page={meta.page}
            totalPages={meta.total_pages}
            total={meta.total}
            onPageChange={setPage}
          />
        ) : null}
      </section>
    </main>
  )
}

function SessionHistoryItem({
  session,
  isRetrying,
  onRetry,
}: {
  session: CvResearchSession
  isRetrying: boolean
  onRetry: () => void
}) {
  const target =
    session.target.target_role ||
    [session.target.seniority_level_name, session.target.job_category_name]
      .filter(Boolean)
      .join(' ')

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(session.status)}>{statusLabel(session.status)}</Badge>
            <Badge variant="outline">{session.type === 'quick' ? 'Quick' : 'Custom'}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3" />
              {formatDateTime(session.created_at)}
            </span>
          </div>
          <div>
            <h2 className="truncate text-lg font-semibold text-zinc-700">
              {target || 'Researching CV direction'}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{session.cv.name}</p>
          </div>
          {['queued', 'processing'].includes(session.status) ? (
            <div className="max-w-xl space-y-2">
              <Progress value={session.progress} />
              <p className="text-xs text-muted-foreground">{session.progress_message}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {session.audit?.suggested_keywords.slice(0, 8).map((keyword) => (
                <Badge key={keyword} variant="outline">{keyword}</Badge>
              ))}
            </div>
          )}
          {session.status === 'failed' ? (
            <p className="text-sm text-destructive">{session.error}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-5 text-sm lg:min-w-56 lg:justify-end">
          <span><span className="text-muted-foreground">Score </span><strong>{session.audit?.overall_score ?? '-'}</strong></span>
          <span><span className="text-muted-foreground">Jobs </span><strong>{session.job_suggestions.length}</strong></span>
          <Link
            to={`/research-history/${session.id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            View details
          </Link>
          {session.status === 'failed' ? (
            <Button type="button" size="sm" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function HistorySkeleton() {
  return <>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</>
}

function EmptyHistory() {
  return (
    <section className="grid min-h-72 place-items-center rounded-xl border bg-card p-8 text-center">
      <div className="space-y-3">
        <BriefcaseBusiness className="mx-auto size-8 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-zinc-700">No research yet</h2>
        <p className="text-sm text-muted-foreground">Choose a CV and start your first research.</p>
        <Link to="/research/new" className={cn(buttonVariants())}>New research</Link>
      </div>
    </section>
  )
}

function getStatusVariant(status: CvResearchSession['status']) {
  if (status === 'completed') return 'default'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

function statusLabel(status: CvResearchSession['status']) {
  if (status === 'processing') return 'In progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
