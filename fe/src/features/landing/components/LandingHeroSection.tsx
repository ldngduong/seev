import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { AnimatedCvPreview } from './AnimatedCvPreview'

export const LandingHeroSection = () => {
  return (
    <section className="overflow-hidden">
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 pt-24 text-center sm:pt-28">
        <div className="flex w-10/12 flex-col items-center gap-5">
          <h1 className="text-5xl font-semibold leading-none tracking-normal sm:text-6xl lg:text-7xl">
            Match your CV to the role that fits
          </h1>

          <p className="w-9/12 text-base leading-7 text-muted-foreground sm:text-lg">
            Seev reviews the document, highlights exact CV evidence, and turns
            the result into role-aware feedback and job suggestions.
          </p>

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
        </div>

        <div className="flex w-full justify-center">
          <AnimatedCvPreview />
        </div>
      </div>
    </section>
  )
}
