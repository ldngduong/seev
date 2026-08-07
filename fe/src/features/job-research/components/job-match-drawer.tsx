import {
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import type { JobPost } from '../types/job-research.types'

import { CompanyLogo, ScoreBadge, SourceBadge } from './job-match-ui'

export function JobMatchDrawer({
  open,
  onOpenChange,
  job,
  score,
  matchedTerms,
  matchReason,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: JobPost
  score: number
  matchedTerms: string[]
  matchReason?: string
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-xl">
        <div className="flex items-start gap-4 overflow-visible px-5 pt-4">
          <CompanyLogo logo={job.logo} name={job.companyName} className="size-14" />
          <div className="min-w-0 flex-1 pr-8">
            <DrawerTitle className="line-clamp-2 leading-snug">
              {job.title}
            </DrawerTitle>
            <DrawerDescription className="mt-1 truncate">
              {[job.companyName, job.locations.join(' · ')]
                .filter(Boolean)
                .join(' — ')}
            </DrawerDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <ScoreBadge score={score} />
            <SourceBadge source={job.source} />
          </div>
        </div>

        <div className="max-h-[72dvh] overflow-y-auto px-5 pb-6 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {job.salaryText ? (
              <MetaChip icon={Banknote} className="text-emerald-600 dark:text-emerald-400">
                {job.salaryText}
              </MetaChip>
            ) : null}
            {job.jobType ? (
              <MetaChip icon={BriefcaseBusiness}>{job.jobType}</MetaChip>
            ) : null}
            {job.level ? <MetaChip icon={BarChart3}>{job.level}</MetaChip> : null}
            {job.experience ? <MetaChip icon={Clock}>{job.experience}</MetaChip> : null}
            {job.locations.slice(0, 3).map((location) => (
              <MetaChip key={location} icon={MapPin}>
                {location}
              </MetaChip>
            ))}
            {formatPostedAt(job.postedAt) ? (
              <MetaChip icon={CalendarDays}>{formatPostedAt(job.postedAt)}</MetaChip>
            ) : null}
          </div>

          {matchedTerms.length > 0 || matchReason ? (
            <div className="mt-4 rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3.5" />
                Why this fits
              </div>
              {matchReason ? (
                <p className="mt-2 text-sm text-foreground">{matchReason}</p>
              ) : null}
              {matchedTerms.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {matchedTerms.map((term) => (
                    <span
                      key={term}
                      className="rounded-full bg-background px-2 py-0.5 text-xs text-foreground"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {job.skills.length > 0 ? (
            <Section title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        <DrawerFooter className="border-t bg-background px-5 py-4">
          <Button
            size="lg"
            onClick={() => openJobPopup(job.sourceUrl)}
          >
            Open job on {job.source}
            <ExternalLink className="size-4" />
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function MetaChip({
  icon: Icon,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  )
}

function openJobPopup(url: string) {
  void window.open(url, '_blank', 'popup,width=960,height=720')
}

function formatPostedAt(value: string | null) {
  if (!value) {
    return null
  }

  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)

  if (days <= 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days < 30) return `Posted ${days} days ago`

  return `Posted ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))}`
}