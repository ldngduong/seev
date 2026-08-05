import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileSearch, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { JobCategoryPicker } from '@/components/job-category-picker'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getSeniorityLevels } from '@/services/career-api'
import {
  createCustomCvResearch,
  createQuickCvResearch,
  listUserCvs,
  MAX_CV_PAGE_SIZE,
} from '@/services/cv-api'

type ResearchMode = 'quick' | 'custom'

export const ResearchCvPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<ResearchMode | null>(null)
  const [selectedCvId, setSelectedCvId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState(0)
  const [targetRole, setTargetRole] = useState('')
  const [seniorityLevelId, setSeniorityLevelId] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { page: 1, status: 'ready', purpose: 'research' }],
    queryFn: () => listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE, status: 'ready' }),
  })
  const seniorityQuery = useQuery({
    queryKey: ['seniority-levels'],
    queryFn: getSeniorityLevels,
  })

  useEffect(() => {
    const cvId = searchParams.get('cvId')
    if (cvId) setSelectedCvId(cvId)
  }, [searchParams])

  const handleCreated = (session: { id: string }) => {
    void navigate(`/research-history/${session.id}`)
  }
  const quickMutation = useMutation({
    mutationFn: createQuickCvResearch,
    onSuccess: handleCreated,
  })
  const customMutation = useMutation({
    mutationFn: createCustomCvResearch,
    onSuccess: handleCreated,
  })
  const isSubmitting = quickMutation.isPending || customMutation.isPending
  const hasCustomTarget = Boolean(selectedCategoryId || jobDescription.trim())

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader
        title="New research"
        actions={
          <Link
            to="/research-history"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <ArrowLeft />
            Research history
          </Link>
        }
      />

      {!mode ? (
        <section className="grid gap-4 md:grid-cols-2">
          <ResearchModeButton
            icon={Sparkles}
            title="Quick research"
            description="Use the CV's own direction to review its content and find suitable jobs."
            onClick={() => setMode('quick')}
          />
          <ResearchModeButton
            icon={SlidersHorizontal}
            title="Custom research"
            description="Compare a CV with a selected job category, level, or employer job description."
            onClick={() => setMode('custom')}
          />
        </section>
      ) : (
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-5 flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-700">
                {mode === 'quick' ? 'Quick research' : 'Custom research'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === 'quick'
                  ? 'Choose the CV you want Seev to review.'
                  : 'Choose a CV and provide the role context you want to compare it with.'}
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={() => setMode(null)}>
              Change mode
            </Button>
          </div>

          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="userCvId">CV</Label>
              <select
                id="userCvId"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                value={selectedCvId}
                disabled={cvsQuery.isLoading || isSubmitting}
                onChange={(event) => setSelectedCvId(event.target.value)}
              >
                <option value="">
                  {cvsQuery.isLoading ? 'Loading CVs...' : 'Choose a saved CV'}
                </option>
                {cvsQuery.data?.items.map((cv) => (
                  <option key={cv.id} value={cv.id}>{cv.name}</option>
                ))}
              </select>
            </div>

            {mode === 'custom' ? (
              <div className="grid gap-5 border-t pt-5">
                <JobCategoryPicker
                  onChange={(ids, label) => {
                    setSelectedCategoryId(ids[0] ?? 0)
                    setTargetRole(label)
                  }}
                />
                <div className="space-y-2">
                  <Label htmlFor="seniorityLevelId">Seniority or position level</Label>
                  <select
                    id="seniorityLevelId"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                    value={seniorityLevelId}
                    disabled={seniorityQuery.isLoading || isSubmitting}
                    onChange={(event) => setSeniorityLevelId(event.target.value)}
                  >
                    <option value="">Choose a level when applicable</option>
                    {seniorityQuery.data?.map((level) => (
                      <option key={level.id} value={level.id}>{level.displayName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Employer job description</Label>
                  <Textarea
                    id="jobDescription"
                    value={jobDescription}
                    disabled={isSubmitting}
                    onChange={(event) => setJobDescription(event.target.value)}
                    placeholder="Paste the job description here"
                    className="min-h-40"
                  />
                  <p className="text-xs text-muted-foreground">
                    A job category or job description is required. You may provide both.
                  </p>
                </div>
              </div>
            ) : null}

            {quickMutation.isError || customMutation.isError ? (
              <p className="text-sm text-destructive">
                Research could not be started. Check the selected CV and try again.
              </p>
            ) : null}

            <div className="flex justify-end border-t pt-5">
              <Button
                type="button"
                disabled={!selectedCvId || isSubmitting || (mode === 'custom' && !hasCustomTarget)}
                onClick={() => {
                  if (mode === 'quick') {
                    quickMutation.mutate(selectedCvId)
                    return
                  }
                  customMutation.mutate({
                    userCvId: selectedCvId,
                    jobCategoryId: selectedCategoryId || undefined,
                    seniorityLevelId: seniorityLevelId || undefined,
                    targetRole: targetRole || undefined,
                    jobDescription: jobDescription.trim() || undefined,
                  })
                }}
              >
                <FileSearch />
                {isSubmitting ? 'Starting research...' : 'Start research'}
              </Button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

function ResearchModeButton({ icon: Icon, title, description, onClick }: {
  icon: typeof Sparkles
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-52 items-start gap-4 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-xl font-semibold text-zinc-700">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
