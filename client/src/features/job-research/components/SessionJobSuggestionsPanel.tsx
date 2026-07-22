import { BriefcaseBusiness, ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CvResearchJobSuggestion } from '@/types/cv'

export function SessionJobSuggestionsPanel({
  jobs,
  status,
  onRetry,
  isRetrying = false,
}: {
  jobs: CvResearchJobSuggestion[]
  status?: 'processing' | 'completed' | 'failed'
  onRetry?: () => void
  isRetrying?: boolean
}) {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BriefcaseBusiness className="size-4" />
          Job suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.length === 0 ? (
          <div className="space-y-3 rounded-md bg-muted px-3 py-2">
            <p className="text-sm text-muted-foreground">
              {status === 'processing'
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
        {jobs.map((match) => (
          <article
            key={`${match.job.source}-${match.job.id}`}
            className="space-y-3 rounded-md border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-semibold">
                  {match.job.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    match.job.company_name,
                    match.job.locations.join(', '),
                    match.job.salary_text,
                  ]
                    .filter(Boolean)
                    .join(' • ') || match.job.source}
                </p>
              </div>
              <Badge variant="outline">{match.match_score}</Badge>
            </div>

            {match.matched_terms.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {match.matched_terms.slice(0, 5).map((term) => (
                  <Badge key={term} variant="secondary">
                    {term}
                  </Badge>
                ))}
              </div>
            ) : null}

            <a
              href={match.job.source_url}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Open job
              <ExternalLink className="size-3" />
            </a>
          </article>
        ))}
      </CardContent>
    </Card>
  )
}
