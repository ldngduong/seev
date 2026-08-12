import { BriefcaseBusiness, Sparkles } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import type { CvResearchJobSuggestion } from '@/entities/cv/types/cv.types'
import { useSessionJobSuggestions } from '@/features/job-research/hooks/use-session-job-suggestions'

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
  const { matches, directMatches, suggestions } = useSessionJobSuggestions(intentId, jobs)

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <BriefcaseBusiness className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-zinc-800">Gợi ý việc làm</h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {matches.length} việc
        </span>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-5">
          <p className="text-sm text-muted-foreground">
            {status === 'queued'
              ? 'Research đang chờ worker khả dụng.'
              : status === 'processing'
                ? 'Các gợi ý việc làm đang được thu thập trong nền.'
                : 'Chưa có việc làm khớp nào được lưu cho research này.'}
          </p>
          {onRetry ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isRetrying}
              onClick={onRetry}
            >
              {isRetrying ? 'Đang thử lại...' : 'Thử lại gợi ý việc làm'}
            </Button>
          ) : null}
        </div>
      ) : null}

      {directMatches.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {directMatches.map((match) => (
            <JobMatchCard key={match.job.id} match={match} />
          ))}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <Sparkles className="size-3.5" />
            Gợi ý thêm — ngành liên quan hoặc cấp bậc chưa khớp
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((match) => (
              <JobMatchCard key={match.job.id} match={match} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
