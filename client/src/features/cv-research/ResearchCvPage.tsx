import { FileText, Search, ShieldCheck, Upload } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { AuditResultPanel } from '@/components/audit-result-panel'
import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { JobCategoryPicker } from '@/components/job-category-picker'
import {
  PdfAuditViewer,
  type HighlightStats,
} from '@/components/pdf-audit-viewer'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { SessionJobSuggestionsPanel } from '@/features/job-research/components/SessionJobSuggestionsPanel'
import { useUserCvPdfFile } from '@/hooks/use-user-cv-pdf-file'
import { useResearchProgress } from '@/hooks/use-research-progress'
import { cn } from '@/lib/utils'
import { getSeniorityLevels } from '@/services/career-api'
import {
  createCustomCvResearch,
  getCvResearchSession,
  createQuickCvResearch,
  listUserCvs,
  listCvResearchSessions,
  retryCvResearchSession,
} from '@/services/cv-api'
import { useAuditStore } from '@/stores/audit-store'
import type { AuditSummary, CvResearchSession } from '@/types/cv'

const workflow = [
  {
    label: 'Upload CV',
    value: 'PDF <= 5MB',
    icon: Upload,
  },
  {
    label: 'Visual Audit',
    value: 'DeepSeek scoring',
    icon: FileText,
  },
  {
    label: 'Career Fit',
    value: 'Keyword + role ideas',
    icon: Search,
  },
]

export const ResearchCvPage = () => {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [audit, setAudit] = useState<AuditSummary | null>(null)
  const [highlightStats, setHighlightStats] = useState<HighlightStats | null>(
    null,
  )
  const [session, setSession] = useState<CvResearchSession | null>(null)
  const [selectedCvId, setSelectedCvId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState(0)
  const [targetRole, setTargetRole] = useState('')
  const [seniorityLevelId, setSeniorityLevelId] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const sessionPhases = useRef(new Map<string, CvResearchSession['phase']>())
  const selectedFeedbackId = useAuditStore((state) => state.selectedFeedbackId)
  const setSelectedFeedbackId = useAuditStore(
    (state) => state.setSelectedFeedbackId,
  )
  const cvsQuery = useQuery({
    queryKey: ['user-cvs'],
    queryFn: listUserCvs,
  })
  const seniorityQuery = useQuery({
    queryKey: ['seniority-levels'],
    queryFn: getSeniorityLevels,
  })
  const sessionsQuery = useQuery({
    queryKey: ['cv-research-sessions'],
    queryFn: () => listCvResearchSessions(100),
  })
  const sessionRefreshQuery = useQuery({
    queryKey: ['cv-research-session', session?.id],
    queryFn: () => getCvResearchSession(session?.id as string),
    enabled: Boolean(session?.id),
  })
  const cvFileQuery = useUserCvPdfFile(selectedCvId)

  useEffect(() => {
    const cvId = searchParams.get('cvId')
    if (cvId) {
      setSelectedCvId(cvId)
    }
  }, [searchParams])

  useEffect(() => {
    if (!sessionRefreshQuery.data) {
      return
    }

    setSession(sessionRefreshQuery.data)
    setAudit(sessionRefreshQuery.data.audit)
  }, [sessionRefreshQuery.data])

  const activeSession = useMemo(
    () =>
      sessionsQuery.data?.find(
        (item) =>
          item.cv.id === selectedCvId &&
          ['queued', 'processing'].includes(item.status),
      ) ?? null,
    [selectedCvId, sessionsQuery.data],
  )

  useEffect(() => {
    if (activeSession) {
      setSession(activeSession)
      setAudit(activeSession.audit)
    } else if (session?.cv.id !== selectedCvId) {
      setSession(null)
      setAudit(null)
    }
  }, [activeSession, selectedCvId, session?.cv.id])

  const handleProgress = useCallback(
    (event: import('@/types/research-progress').ResearchProgressEvent) => {
      queryClient.setQueryData<CvResearchSession[]>(
        ['cv-research-sessions'],
        (current) =>
          current?.map((item) =>
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
      )
      setSession((current) =>
        current?.id === event.session_id
          ? {
              ...current,
              status: event.status,
              phase: event.phase,
              progress: event.progress,
              progress_message: event.message,
              attempt: event.attempt,
              error: event.error,
              updated_at: event.updated_at,
            }
          : current,
      )

      const previousPhase = sessionPhases.current.get(event.session_id)
      sessionPhases.current.set(event.session_id, event.phase)
      if (previousPhase !== event.phase) {
        void queryClient.invalidateQueries({
          queryKey: ['cv-research-session', event.session_id],
        })
        void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
      }
    },
    [queryClient],
  )
  const reconcileProgress = useCallback(() => {
    void sessionsQuery.refetch()
    if (session?.id) {
      void queryClient.invalidateQueries({
        queryKey: ['cv-research-session', session.id],
      })
    }
  }, [queryClient, session?.id, sessionsQuery])
  useResearchProgress(handleProgress, reconcileProgress)

  const activeFeedback = useMemo(
    () =>
      audit?.detailed_feedbacks.find(
        (feedback) => feedback.id === selectedFeedbackId,
      ) ?? null,
    [audit, selectedFeedbackId],
  )

  const handleResearchComplete = useCallback((nextSession: CvResearchSession) => {
    setHighlightStats(null)
    setSession(nextSession)
    setAudit(nextSession.audit)
    setSelectedCvId(nextSession.cv.id)
    setSelectedFeedbackId(nextSession.audit?.detailed_feedbacks[0]?.id ?? null)
    void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
    void queryClient.invalidateQueries({ queryKey: ['job-research-intents'] })
  }, [queryClient, setSelectedFeedbackId])

  const quickResearchMutation = useMutation({
    mutationFn: createQuickCvResearch,
    onSuccess: handleResearchComplete,
  })
  const customResearchMutation = useMutation({
    mutationFn: createCustomCvResearch,
    onSuccess: handleResearchComplete,
  })
  const retryResearchMutation = useMutation({
    mutationFn: retryCvResearchSession,
    onSuccess: handleResearchComplete,
  })
  const researchIsActive =
    session?.cv.id === selectedCvId &&
    ['queued', 'processing'].includes(session.status)
  const researchIsBusy =
    researchIsActive ||
    quickResearchMutation.isPending ||
    customResearchMutation.isPending ||
    retryResearchMutation.isPending

  const handleHighlightStatsChange = useCallback((stats: HighlightStats) => {
    setHighlightStats((current) => {
      if (
        current?.matchedCount === stats.matchedCount &&
        current.totalCount === stats.totalCount &&
        current.unmatchedFeedbackIds.join('|') ===
          stats.unmatchedFeedbackIds.join('|')
      ) {
        return current
      }

      return stats
    })
  }, [])

  return (
    <main className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title="Smart CV auditor workspace"
        actions={
          <>
            <Link
              to="/research-history"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Research history
            </Link>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <ShieldCheck className="size-4 text-primary" />
              React TS + NestJS
            </div>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        {workflow.map((item) => (
          <Card key={item.label} className="rounded-2xl shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium text-zinc-700">
                {item.label}
              </CardTitle>
              <item.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-semibold text-zinc-700">
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid min-h-[680px] gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="flex min-h-[620px] flex-col rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-700">
                PDF viewer
              </h2>
              <p className="text-sm text-muted-foreground">
                Click highlighted PDF text to view the detailed feedback.
              </p>
            </div>
            <Badge variant={selectedFeedbackId ? 'default' : 'outline'}>
              {highlightStats
                ? `${highlightStats.matchedCount}/${highlightStats.totalCount} highlights`
                : selectedFeedbackId ?? 'No feedback selected'}
            </Badge>
          </div>
          <PdfAuditViewer
            file={cvFileQuery.data ?? null}
            feedbacks={audit?.detailed_feedbacks ?? []}
            activeFeedback={activeFeedback}
            onHighlightStatsChange={handleHighlightStatsChange}
          />
          {cvFileQuery.isError ? (
            <p className="border-t px-4 py-3 text-sm text-destructive">
              Could not load the selected CV file from backend.
            </p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-zinc-700">
                Start research
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userCvId">CV của tôi</Label>
                <select
                  id="userCvId"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={selectedCvId}
                  disabled={cvsQuery.isLoading}
                  onChange={(event) => setSelectedCvId(event.target.value)}
                >
                  <option value="">
                    {cvsQuery.isLoading ? 'Loading...' : 'Choose saved CV'}
                  </option>
                  {cvsQuery.data?.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={!selectedCvId || researchIsBusy}
                onClick={() => quickResearchMutation.mutate(selectedCvId)}
              >
                {researchIsActive ? 'Research in progress' : 'Quick research'}
              </Button>

              <div className="space-y-3 rounded-md border p-3">
                <JobCategoryPicker
                  onChange={(ids, label) => {
                    setSelectedCategoryId(ids[0] ?? 0)
                    setTargetRole(label)
                  }}
                />
                <div className="space-y-2">
                  <Label htmlFor="seniorityLevelId">
                    Seniority / position level
                  </Label>
                  <select
                    id="seniorityLevelId"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={seniorityLevelId}
                    disabled={seniorityQuery.isLoading}
                    onChange={(event) => setSeniorityLevelId(event.target.value)}
                  >
                    <option value="">
                      {seniorityQuery.isLoading ? 'Loading...' : 'Choose level'}
                    </option>
                    {seniorityQuery.data?.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Paste JD</Label>
                  <Textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    placeholder="Paste employer job description..."
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!selectedCvId || researchIsBusy}
                  onClick={() =>
                    customResearchMutation.mutate({
                      userCvId: selectedCvId,
                      jobCategoryId: selectedCategoryId || undefined,
                      seniorityLevelId: seniorityLevelId || undefined,
                      targetRole: targetRole || undefined,
                      jobDescription: jobDescription || undefined,
                    })
                  }
                >
                  Custom research
                </Button>
              </div>

              {quickResearchMutation.isError || customResearchMutation.isError ? (
                <p className="text-sm text-destructive">
                  Research failed. Please check the selected CV and target.
                </p>
              ) : null}

              {session?.cv.id === selectedCvId ? (
                <div className="space-y-2 rounded-md bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-700">
                      {formatResearchPhase(session.phase)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {session.progress}%
                    </span>
                  </div>
                  <Progress value={session.progress} />
                  <p className="text-sm text-muted-foreground">
                    {session.progress_message}
                  </p>
                  {session.status === 'failed' ? (
                    <>
                      <p className="text-sm text-destructive">{session.error}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={retryResearchMutation.isPending}
                        onClick={() => retryResearchMutation.mutate(session.id)}
                      >
                        {retryResearchMutation.isPending
                          ? 'Retrying...'
                          : 'Retry this research'}
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
          <AuditResultPanel audit={audit} />
          <SessionJobSuggestionsPanel
            jobs={session?.job_suggestions ?? []}
            status={session?.status}
          />
        </aside>
      </section>
    </main>
  )
}

function formatResearchPhase(phase: CvResearchSession['phase']) {
  return phase.replaceAll('_', ' ')
}
