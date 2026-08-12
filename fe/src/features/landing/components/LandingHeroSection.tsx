import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

import { AnimatedCvPreview } from './AnimatedCvPreview'

export const LandingHeroSection = () => {
  return (
    <section className="overflow-hidden px-4 pb-8 sm:px-6">
      <div className="flex min-h-svh flex-col items-center justify-center gap-8 pt-24 text-center sm:pt-28">
        <div className="flex w-full max-w-5xl flex-col items-center gap-5">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-normal sm:text-6xl lg:text-7xl">
            Tìm công việc CNTT phù hợp với CV của bạn
          </h1>

          <p className="w-full max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Seev giúp bạn biết CV phù hợp với mảng nào, đang ở mức kinh nghiệm nào và những việc làm nào đáng để ứng tuyển.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className={buttonVariants({ size: 'lg' })}>
              Phân tích CV CNTT
              <ArrowUpRight />
            </Link>
            <a
              href="#scoring"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
              )}
            >
              Seev hoạt động thế nào
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
