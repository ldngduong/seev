import { Search } from 'lucide-react'

import { AnimatedCvPreview } from '@/features/landing/components/AnimatedCvPreview'
import { Progress } from '@/shared/components/ui/progress'

export function ResearchProcessingScreen({
  progress,
  message,
}: {
  progress: number
  message: string | null
}) {
  return (
    <section className="grid min-h-[calc(100svh-8rem)] place-items-center overflow-hidden rounded-xl border bg-card p-4 sm:min-h-[calc(100vh-12rem)] sm:p-6">
      <div className="grid w-full place-items-center gap-7 text-center">
        <div className="relative w-full max-w-72 sm:max-w-[28rem]">
          <AnimatedCvPreview />
          <div className="seev-research-magnifier pointer-events-none absolute left-1/2 top-1/2 z-30 grid size-16 place-items-center rounded-full border bg-background/95 text-primary shadow-lg">
            <Search className="size-7" />
          </div>
        </div>
        <div className="w-full max-w-[32rem] space-y-3">
          <h2 className="text-xl font-semibold text-zinc-700">Đang phân tích CV của bạn</h2>
          <p className="min-h-5 text-sm text-muted-foreground">
            {message || 'Đang chuẩn bị research...'}
          </p>
          <Progress value={progress} />
          <p className="text-xs tabular-nums text-muted-foreground">{progress}%</p>
        </div>
      </div>
    </section>
  )
}
