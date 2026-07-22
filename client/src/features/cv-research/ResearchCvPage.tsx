import { FileText, Search, ShieldCheck, Upload } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { AuditResultPanel } from '@/components/audit-result-panel'
import { JobCategoryPicker } from '@/components/job-category-picker'
import {
  PdfAuditViewer,
  type HighlightStats,
} from '@/components/pdf-audit-viewer'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SessionJobSuggestionsPanel } from '@/features/job-research/components/SessionJobSuggestionsPanel'
import { useUserCvPdfFile } from '@/hooks/use-user-cv-pdf-file'
import { cn } from '@/lib/utils'
import { getSeniorityLevels } from '@/services/career-api'
import {
  createCustomCvResearch,
  getCvResearchSession,
  createQuickCvResearch,
  listUserCvs,
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
  const sessionRefreshQuery = useQuery({
    queryKey: ['cv-research-session', session?.id],
    queryFn: () => getCvResearchSession(session?.id as string),
    enabled: Boolean(session?.id),
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' ? 3_000 : false,
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
  }, [setSelectedFeedbackId])

  const quickResearchMutation = useMutation({
    mutationFn: createQuickCvResearch,
    onSuccess: handleResearchComplete,
  })
  const customResearchMutation = useMutation({
    mutationFn: createCustomCvResearch,
    onSuccess: handleResearchComplete,
  })

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
      <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            AI Resume Matcher
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
              Smart CV auditor workspace
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Upload a PDF, let DeepSeek score the CV, highlight the exact
              feedback text, then review keyword and role suggestions.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {workflow.map((item) => (
          <Card key={item.label} className="rounded-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <item.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid min-h-[680px] gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="flex min-h-[620px] flex-col rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">PDF viewer</h2>
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
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-base">Start research</CardTitle>
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
                disabled={!selectedCvId || quickResearchMutation.isPending}
                onClick={() => quickResearchMutation.mutate(selectedCvId)}
              >
                Quick research
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
                  disabled={!selectedCvId || customResearchMutation.isPending}
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
