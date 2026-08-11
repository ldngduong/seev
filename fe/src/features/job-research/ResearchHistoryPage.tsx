import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BriefcaseBusiness, Clock3, FileText, RefreshCw, Search } from 'lucide-react'
import { useCallback, useDeferredValue, useState } from 'react'
import { Link } from 'react-router'

import { DataPagination } from '@/components/data/DataPagination'
import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
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
        title="Lịch sử research"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void sessionsQuery.refetch()}
              disabled={sessionsQuery.isFetching}
            >
              <RefreshCw />
              Làm mới
            </Button>
            <Link to="/research/new" className={cn(buttonVariants())}>
              <FileText />
              Research mới
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
              placeholder="Tìm theo CV hoặc vị trí mục tiêu"
              className="pl-9"
            />
          </label>
          <Combobox
            value={cvId}
            onChange={(value) => {
              setCvId(String(value))
              setPage(1)
            }}
            placeholder="Lọc theo CV..."
            searchPlaceholder="Tìm theo tên CV..."
            emptyMessage="Không tìm thấy CV"
            options={[
              { value: 'all', label: 'Tất cả CV' },
              ...(cvsQuery.data?.items ?? []).map((cv) => ({
                value: cv.id,
                label: cv.name,
              })),
            ]}
            className="w-full sm:w-64 sm:shrink-0 sm:basis-64"
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value ?? 'all')
              setPage(1)
            }}
            items={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'queued', label: 'Đang chờ' },
              { value: 'processing', label: 'Đang xử lý' },
              { value: 'completed', label: 'Hoàn tất' },
              { value: 'failed', label: 'Thất bại' },
            ]}
          >
            <SelectTrigger className="w-full border-border bg-background sm:w-44" aria-label="Lọc theo trạng thái">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="queued">Đang chờ</SelectItem>
              <SelectItem value="processing">Đang xử lý</SelectItem>
              <SelectItem value="completed">Hoàn tất</SelectItem>
              <SelectItem value="failed">Thất bại</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value ?? 'all')
              setPage(1)
            }}
            items={[
              { value: 'all', label: 'Tất cả loại' },
              { value: 'quick', label: 'Research nhanh' },
              { value: 'custom', label: 'Research tùy chỉnh' },
            ]}
          >
            <SelectTrigger className="w-full border-border bg-background sm:w-52" aria-label="Lọc theo loại research">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="quick">Research nhanh</SelectItem>
              <SelectItem value="custom">Research tùy chỉnh</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sessionsQuery.isLoading ? <HistorySkeleton /> : null}
        {sessionsQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Không tải được lịch sử research.
          </div>
        ) : null}
        {!sessionsQuery.isLoading && !sessions.length ? <EmptyHistory /> : null}
        {sessions.length > 0 ? (
          <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
            {sessions.map((session) => (
              <SessionHistoryItem
                key={session.id}
                session={session}
                isRetrying={retryMutation.isPending && retryMutation.variables === session.id}
                onRetry={() => retryMutation.mutate(session.id)}
              />
            ))}
          </div>
        ) : null}
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
    <article className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(session.status)}>{statusLabel(session.status)}</Badge>
          <Badge variant="outline">{session.type === 'quick' ? 'Nhanh' : 'Tùy chỉnh'}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3" />
            {formatDateTime(session.created_at)}
          </span>
        </div>
          <div>
            <h2 className="truncate text-lg font-semibold text-zinc-700">
              {target || 'Đang nghiên cứu định hướng CV'}
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
          <span><span className="text-muted-foreground">Điểm </span><strong>{session.audit?.overall_score ?? '-'}</strong></span>
          <span><span className="text-muted-foreground">Việc </span><strong>{session.job_suggestions.length}</strong></span>
          <Link
            to={`/research-history/${session.id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Xem chi tiết
          </Link>
          {session.status === 'failed' ? (
            <Button type="button" size="sm" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? 'Đang thử lại...' : 'Thử lại'}
            </Button>
          ) : null}
        </div>
    </article>
  )
}

function HistorySkeleton() {
  return <>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}</>
}

function EmptyHistory() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
      <BriefcaseBusiness className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-800">Chưa có research nào</h2>
        <p className="text-sm text-muted-foreground">Chọn một CV và bắt đầu research đầu tiên.</p>
      </div>
      <Link to="/research/new" className={cn(buttonVariants())}>Research mới</Link>
    </section>
  )
}

function getStatusVariant(status: CvResearchSession['status']) {
  if (status === 'completed') return 'default'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

function statusLabel(status: CvResearchSession['status']) {
  const labels: Record<CvResearchSession['status'], string> = {
    queued: 'Đang chờ',
    processing: 'Đang xử lý',
    completed: 'Hoàn tất',
    failed: 'Thất bại',
  }
  return labels[status]
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
