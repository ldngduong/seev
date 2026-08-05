import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, History, RefreshCw } from 'lucide-react'
import { useCallback } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { DataPagination } from '@/components/data/DataPagination'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useResearchProgress } from '@/hooks/use-research-progress'
import {
  listCvResearchSessions,
  listUserCvs,
  MAX_CV_PAGE_SIZE,
  type PaginatedResponse,
} from '@/services/cv-api'
import type { CvResearchSession, UserCv } from '@/types/cv'

export function MyCvDetailPage() {
  const { cvId } = useParams()
  const queryClient = useQueryClient()
  const [historyPage, setHistoryPage] = useState(1)
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { search: cvId, purpose: 'detail' }],
    queryFn: () => listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE }),
  })
  const sessionsQuery = useQuery({
    queryKey: ['cv-research-sessions', { userCvId: cvId, page: historyPage }],
    queryFn: () => listCvResearchSessions({
      page: historyPage,
      pageSize: 6,
      userCvId: cvId,
    }),
    enabled: Boolean(cvId),
  })
  const handleProgress = useCallback(
    (event: import('@/types/research-progress').ResearchProgressEvent) => {
      queryClient.setQueriesData<PaginatedResponse<CvResearchSession>>(
        { queryKey: ['cv-research-sessions'] },
        (current) =>
          current ? {
            ...current,
            items: current.items.map((session) =>
              session.id === event.session_id
                ? {
                    ...session,
                    status: event.status,
                    phase: event.phase,
                    progress: event.progress,
                    progress_message: event.message,
                    attempt: event.attempt,
                    error: event.error,
                    updated_at: event.updated_at,
                  }
                : session,
            ),
          } : current,
      )
      if (['completed', 'failed'].includes(event.status)) {
        void sessionsQuery.refetch()
      }
    },
    [queryClient, sessionsQuery],
  )
  const reconcileProgress = useCallback(() => {
    void sessionsQuery.refetch()
  }, [sessionsQuery])
  useResearchProgress(handleProgress, reconcileProgress)
  const cv = cvsQuery.data?.items.find((item) => item.id === cvId)
  const sessions = sessionsQuery.data?.items ?? []

  if (cvsQuery.isLoading) {
    return <CvDetailSkeleton />
  }

  if (!cv) {
    return (
      <main className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-md border bg-card text-center">
        <FileText className="size-8 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">Không tìm thấy CV</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CV này không tồn tại hoặc không thuộc tài khoản hiện tại.
          </p>
        </div>
        <Link
          to="/my-cvs"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Quay lại CV của tôi
        </Link>
      </main>
    )
  }

  return (
    <main className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title={
          <div className="min-w-0">
            <Link
              to="/my-cvs"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              My CVs
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-3xl font-semibold tracking-normal text-zinc-700">
                {cv.name}
              </h1>
              <Badge variant={cv.status === 'ready' ? 'default' : 'secondary'}>
                {cv.status}
              </Badge>
            </div>
          </div>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void cvsQuery.refetch()
                void sessionsQuery.refetch()
              }}
              disabled={cvsQuery.isFetching || sessionsQuery.isFetching}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Link
              to={`/research/new?cvId=${cv.id}`}
              className={cn(buttonVariants())}
            >
              New research
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card className="overflow-hidden rounded-2xl shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-700">
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[620px] overflow-hidden rounded-md border bg-muted">
              <object
                data={`${cv.file_url}#page=1&toolbar=0&navpanes=0`}
                type="application/pdf"
                className="h-[620px] w-full"
                aria-label={cv.name}
              >
                <div className="grid h-[620px] place-items-center">
                  <FileText className="size-10 text-muted-foreground" />
                </div>
              </object>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="info" className="min-w-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Info CV</TabsTrigger>
            <TabsTrigger value="history">Lịch sử research</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-4">
            <CvInfoCard cv={cv} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <CvResearchHistoryCard
              sessions={sessions}
              isLoading={sessionsQuery.isLoading}
              page={sessionsQuery.data?.meta.page ?? 1}
              totalPages={sessionsQuery.data?.meta.total_pages ?? 1}
              total={sessionsQuery.data?.meta.total ?? 0}
              onPageChange={setHistoryPage}
            />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}

function CvInfoCard({ cv }: { cv: UserCv }) {
  const rows = [
    ['Tên hiển thị', cv.name],
    ['File gốc', cv.original_file_name],
    ['Định dạng', cv.mime_type],
    ['Số trang', `${cv.total_pages}`],
    ['Dung lượng', `${Math.round(cv.size_bytes / 1024)} KB`],
    ['Ngày upload', formatDateTime(cv.created_at)],
    ['Cập nhật', formatDateTime(cv.updated_at)],
  ]

  return (
    <Card className="rounded-2xl shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-zinc-700">
          Thông tin CV
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
          >
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="min-w-0 text-right text-sm font-medium">
              {value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function CvResearchHistoryCard({
  sessions,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
}: {
  sessions: CvResearchSession[]
  isLoading: boolean
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-none">
        <CardContent className="grid gap-3 pt-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-md" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-700">
          <History className="size-4" />
          Lịch sử research
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {sessions.length === 0 ? (
          <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
            CV này chưa có research nào.
          </p>
        ) : null}
        {sessions.map((session) => (
          <Link
            key={session.id}
            to={`/research-history/${session.id}`}
            className="block rounded-2xl border bg-background p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getStatusVariant(session.status)}>
                    {session.status}
                  </Badge>
                  <Badge variant="outline">{session.type}</Badge>
                </div>
                <h2 className="mt-3 truncate font-semibold text-zinc-700">
                  {formatTarget(session)}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(session.created_at)}
                </p>
                {['queued', 'processing'].includes(session.status) ? (
                  <div className="mt-3 space-y-2">
                    <Progress value={session.progress} />
                    <p className="text-xs text-muted-foreground">
                      {session.progress_message}
                    </p>
                  </div>
                ) : null}
                {session.status === 'failed' ? (
                  <p className="mt-3 line-clamp-2 text-xs text-destructive">
                    {session.error}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-zinc-700">
                  {session.audit?.overall_score ?? '-'}
                </p>
                <p className="text-xs text-muted-foreground">score</p>
              </div>
            </div>
          </Link>
        ))}
        <DataPagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  )
}

function CvDetailSkeleton() {
  return (
    <main className="flex w-full flex-col gap-6">
      <Skeleton className="h-24 rounded-md" />
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Skeleton className="h-[720px] rounded-md" />
        <Skeleton className="h-[360px] rounded-md" />
      </section>
    </main>
  )
}

function formatTarget(session: CvResearchSession) {
  return (
    session.target.target_role ||
    [
      session.target.seniority_level_name,
      session.target.job_category_name,
    ]
      .filter(Boolean)
      .join(' ') || 'AI inferred research'
  )
}

function getStatusVariant(status: CvResearchSession['status']) {
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
