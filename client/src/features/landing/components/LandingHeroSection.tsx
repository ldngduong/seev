import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { AnimatedCvPreview } from './AnimatedCvPreview'

const proofPoints = [
  'Role-fit scoring',
  'CV evidence review',
  'Job keyword suggestions',
]

export const LandingHeroSection = () => {
  return (
    <section className="overflow-hidden rounded-4xl bg-card">
      <div className="grid min-h-[calc(100svh-5.5rem)] items-center gap-8 p-[calc(var(--page-pad)*1.5)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <div className="w-fit rounded-4xl border bg-background px-3 py-1 text-xs font-medium">
            CV review workspace
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold leading-none tracking-normal sm:text-5xl lg:text-7xl">
              Build a sharper CV for the jobs that fit
            </h1>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              Seev reviews your resume against a selected role, highlights the
              exact evidence, and turns the feedback into practical job and
              keyword guidance.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className={buttonVariants({ size: 'lg' })}>
              Start review
              <ArrowUpRight />
            </Link>
            <a
              href="#scoring"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
              )}
            >
              View workflow
            </a>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <AnimatedCvPreview />
        </div>
      </div>
    </section>
  )
}
