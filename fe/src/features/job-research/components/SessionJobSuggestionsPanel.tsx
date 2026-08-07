import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getJobResearchJobs } from '../api/job-research-api'
import type { JobIntentMatchResult } from '../types/job-research.types'
import type { CvResearchJobSuggestion } from '@/types/cv'

import { JobMatchCard } from './job-match-card'

export function SessionJobSuggestionsPanel({
  jobs,
  status,
  onRetry,
  isRetrying = false,
  intentId,
}: {
  jobs: CvResearchJobSuggestion[]
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  onRetry?: () => void
  isRetrying?: boolean
  intentId: string | null
}) {
  const intentJobsQuery = useQuery({
    queryKey: ['job-research-jobs', intentId],
    queryFn: () => getJobResearchJobs(intentId as string),
    enabled: Boolean(intentId),
  })

  const richMatches: JobIntentMatchResult[] | undefined = intentJobsQuery.data
  // Live matches win when the intent actually finished saving them. But an
  // empty/[] result must NOT override the completed research snapshot — the
  // intent's matches table may have been wiped by a stalled re-run while the
  // snapshot still holds the last completed results.
  const matches =
    richMatches && richMatches.length > 0
      ? richMatches
      : jobs.map(snapshotToMatch)

  const directMatches = matches.filter((match) => match.match_kind !== 'suggestion')
  const suggestions = matches.filter((match) => match.match_kind === 'suggestion')

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BriefcaseBusiness className="size-4" />
          Job suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.length === 0 ? (
          <div className="space-y-3 rounded-md bg-muted px-3 py-2">
            <p className="text-sm text-muted-foreground">
              {status === 'queued'
                ? 'Research is waiting for an available worker.'
                : status === 'processing'
                  ? 'Job suggestions are being collected in the background.'
                  : 'No matching jobs were saved for this research.'}
            </p>
            {onRetry ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRetrying}
                onClick={onRetry}
              >
                {isRetrying ? 'Retrying...' : 'Retry job suggestions'}
              </Button>
            ) : null}
          </div>
        ) : null}
        {directMatches.map((match) => (
          <JobMatchCard key={match.job.id} match={match} />
        ))}
        {suggestions.length > 0 ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4" />
              Gợi ý thêm — ngành liên quan hoặc cấp bậc chưa khớp
            </div>
            {suggestions.map((match) => (
              <JobMatchCard key={match.job.id} match={match} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function snapshotToMatch(suggestion: CvResearchJobSuggestion): JobIntentMatchResult {
  const { job } = suggestion

  return {
    match_score: suggestion.match_score,
    matched_terms: suggestion.matched_terms,
    match_kind: 'match',
    match_reason: '',
    job: {
      id: job.id,
      source: job.source as JobIntentMatchResult['job']['source'],
      sourceJobId: '',
      sourceUrl: job.source_url,
      title: job.title,
      companyName: job.company_name,
      salaryText: job.salary_text,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      jobType: null,
      level: null,
      experience: null,
      logo: null,
      locations: job.locations,
      seniorityText: job.seniority_text,
      jobCategoryId: null,
      jobCategoryName: null,
      seniorityLevelId: null,
      seniorityLevelName: null,
      skills: job.skills,
      postedAt: null,
      expiredAt: null,
      lastSeenAt: '',
      createdAt: '',
      updatedAt: '',
    },
  }
}