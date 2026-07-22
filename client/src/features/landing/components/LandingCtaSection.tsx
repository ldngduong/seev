import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'

export const LandingCtaSection = () => {
  return (
    <section id="career-fit" className="rounded-4xl bg-card">
      <div className="grid gap-6 p-[calc(var(--page-pad)*1.5)]">
        <div className="mx-auto flex flex-col items-center gap-4 text-center">
          <div className="w-fit rounded-4xl border bg-background px-3 py-1 text-xs font-medium">
            Career fit
          </div>
          <h2 className="text-4xl font-semibold leading-none tracking-normal md:text-6xl">
            Turn CV feedback into a focused job search
          </h2>
          <p className="text-base leading-7 text-muted-foreground lg:w-7/12">
            Use Seev to connect CV evidence with role expectations, keyword
            gaps, and realistic job suggestions.
          </p>
        </div>

        <div className="relative min-h-[26rem] overflow-hidden rounded-4xl bg-muted">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary),white_35%),transparent_30%),linear-gradient(135deg,var(--muted),var(--background))]" />
          <div className="absolute left-[8%] top-[18%] rounded-4xl bg-background px-3 py-1 text-xs font-medium">
            Target role
          </div>
          <div className="absolute right-[10%] top-[28%] rounded-4xl bg-background px-3 py-1 text-xs font-medium">
            Keyword gap
          </div>
          <div className="absolute left-[36%] top-[48%] rounded-4xl bg-background px-3 py-1 text-xs font-medium">
            Score evidence
          </div>

          <div className="absolute inset-x-[5%] bottom-5 grid overflow-hidden rounded-3xl bg-background/80 backdrop-blur md:grid-cols-[1fr_1fr_0.8fr]">
            <div className="p-[var(--page-pad)]">
              <h3 className="text-xl font-semibold">Role-ready CV</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Align the resume with job expectations before applying.
              </p>
            </div>
            <div className="border-t p-[var(--page-pad)] md:border-s md:border-t-0">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Match progress</span>
                <span>+34%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-full w-8/12 rounded-full bg-primary" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t bg-foreground p-[var(--page-pad)] text-background md:border-s md:border-t-0">
              <span className="text-xl font-semibold leading-tight">
                Try Seev
              </span>
              <Link
                to="/login"
                className={buttonVariants({ variant: 'secondary', size: 'icon-lg' })}
              >
                <ArrowUpRight />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
