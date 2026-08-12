import { useQuery } from '@tanstack/react-query'

import type { CvResearchJobSuggestion } from '@/entities/cv/types/cv.types'
import { getJobResearchJobs } from '@/features/job-research/api/job-research-api'
import type { JobIntentMatchResult } from '@/features/job-research/types/job-research.types'

export function useSessionJobSuggestions(intentId: string | null, jobs: CvResearchJobSuggestion[]) {
  const query = useQuery({
    queryKey: ['job-research-jobs', intentId],
    queryFn: () => getJobResearchJobs(intentId as string),
    enabled: Boolean(intentId),
  })
  const richMatches: JobIntentMatchResult[] | undefined = query.data
  const matches = richMatches && richMatches.length > 0 ? richMatches : jobs.map(snapshotToMatch)
  return {
    matches,
    directMatches: matches.filter((match) => match.match_kind !== 'suggestion'),
    suggestions: matches.filter((match) => match.match_kind === 'suggestion'),
  }
}

function snapshotToMatch(suggestion: CvResearchJobSuggestion): JobIntentMatchResult {
  const { job } = suggestion
  return {
    match_score: suggestion.match_score, matched_terms: suggestion.matched_terms,
    match_kind: 'match', match_reason: suggestion.match_reason ?? '',
    job: {
      id: job.id, source: job.source as JobIntentMatchResult['job']['source'], sourceJobId: '',
      sourceUrl: job.source_url, title: job.title, companyName: job.company_name,
      salaryText: job.salary_text, salaryMin: null, salaryMax: null, salaryCurrency: null,
      jobType: null, level: null, experience: null, logo: null, locations: job.locations,
      seniorityText: job.seniority_text, jobCategoryId: null, jobCategoryName: null,
      seniorityLevelId: null, seniorityLevelName: null, skills: job.skills, postedAt: null,
      expiredAt: job.expired_at, lastSeenAt: '', createdAt: '', updatedAt: '',
    },
  }
}
