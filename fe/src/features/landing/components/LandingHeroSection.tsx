import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

import { AnimatedCvPreview } from './AnimatedCvPreview'

export const LandingHeroSection = () => {
  return (
    <section className="overflow-hidden p-6">
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 pt-24 text-center sm:pt-28">
        <div className="flex w-10/12 flex-col items-center gap-5">
          <h1 className="text-5xl font-semibold leading-none tracking-normal sm:text-6xl lg:text-7xl">
            Tìm công việc phù hợp với CV của bạn
          </h1>

          <p className="w-9/12 text-base leading-7 text-muted-foreground sm:text-lg">
            Seev phân tích từng chi tiết trong CV, chỉ ra điểm mạnh, điểm cần cải thiện và gợi ý những vị trí phù hợp với hồ sơ của bạn.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className={buttonVariants({ size: 'lg' })}>
              Đánh giá CV
              <ArrowUpRight />
            </Link>
            <a
              href="#scoring"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
              )}
            >
              Luồng hoạt động
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
