import { FileWarning, Goal, ListChecks, SearchCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

const problems = [
  {
    title: 'Feedback without evidence',
    copy: 'Most resume reviews tell candidates what to change, but do not show the exact sentence that created the issue.',
    icon: FileWarning,
  },
  {
    title: 'Unclear role alignment',
    copy: 'A CV can look polished while still pointing to the wrong job family, seniority, or skill profile.',
    icon: Goal,
  },
  {
    title: 'Weak keyword coverage',
    copy: 'Missing terms reduce discoverability across ATS filters and job boards, even when the candidate has relevant work.',
    icon: SearchCheck,
  },
  {
    title: 'Generic next steps',
    copy: 'Candidates need prioritized guidance that fits the role they selected, not broad checklist advice.',
    icon: ListChecks,
  },
]

const visualTiles = [
  'from-primary/30 via-primary/10 to-background',
  'from-muted via-primary/10 to-primary/20',
]

export const LandingProblemSection = () => {
  return (
    <section id="product" className="relative z-10 rounded-4xl bg-card p-6">
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.05fr_1.05fr_1.05fr]">
        <div className="flex flex-col gap-2">
          <div className="w-fit rounded-4xl border bg-background px-3 py-1 text-xs font-medium">
            Review gaps
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {visualTiles.map((tile) => (
              <div
                key={tile}
                className={cn(
                  'min-h-36 rounded-3xl bg-gradient-to-br',
                  tile,
                )}
              >
                <div className="flex h-full flex-col justify-between p-3">
                  <div className="h-2 w-7/12 rounded-full bg-background/75" />
                  <div className="grid gap-2">
                    <div className="h-3 w-9/12 rounded-full bg-foreground/18" />
                    <div className="h-3 w-6/12 rounded-full bg-foreground/12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-3">
          <h2 className="text-3xl font-semibold leading-tight tracking-normal md:text-5xl lg:w-7/12">
            Key challenges in matching a CV to the right role
          </h2>

          <div className="grid gap-2 md:grid-cols-3">
            {problems.map((problem, index) => (
              <div
                key={problem.title}
                className={cn(
                  'flex min-h-44 flex-col justify-between rounded-3xl bg-muted/70 p-5',
                  index === 3 && 'bg-primary/20 md:col-start-2',
                )}
              >
                <div className="flex flex-col gap-7">
                  <problem.icon className="size-5 text-primary" />
                  <h3 className="text-lg font-semibold leading-tight">
                    {problem.title}
                  </h3>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {problem.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
