import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'

export const LandingCtaSection = () => {
  return (
    <section id="pricing" className="rounded-4xl bg-card p-6">
      <div className="grid gap-6">
        <div className="mx-auto flex flex-col items-center gap-4 text-center">
          <div className="w-fit rounded-4xl border bg-background px-3 py-1 text-xs font-medium">
            Mức độ phù hợp
          </div>
          <h2 className="text-4xl font-semibold leading-none tracking-normal md:text-6xl">
            Biến phản hồi CV thành chiến lược tìm việc có trọng tâm
          </h2>
          <p className="text-base leading-7 text-muted-foreground lg:w-7/12">
            Seev kết nối bằng chứng trong CV với yêu cầu vị trí, khoảng trống
            từ khóa và gợi ý việc làm thực tế.
          </p>
        </div>

        <div className="relative min-h-[26rem] overflow-hidden rounded-4xl bg-muted">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary),white_35%),transparent_30%),linear-gradient(135deg,var(--muted),var(--background))]" />
          <div className="absolute left-[8%] top-[18%] rounded-4xl bg-background px-3 py-1 text-xs font-medium">
            Vị trí mục tiêu
          </div>
          <div className="absolute right-[10%] top-[28%] rounded-4xl bg-background px-3 py-1 text-xs font-medium">
            Khoảng trống từ khóa
          </div>
          <div className="absolute left-[36%] top-[48%] rounded-4xl bg-background px-3 py-1 text-xs font-medium">
            Căn cứ điểm số
          </div>

          <div className="absolute inset-x-[5%] bottom-5 grid overflow-hidden rounded-3xl bg-background/80 backdrop-blur md:grid-cols-[1fr_1fr_0.8fr]">
            <div className="p-5">
              <h3 className="text-xl font-semibold">CV sẵn sàng cho vị trí</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Chuẩn hóa hồ sơ theo yêu cầu công việc trước khi ứng tuyển.
              </p>
            </div>
            <div className="border-t p-5 md:border-s md:border-t-0">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Tiến độ khớp</span>
                <span>+34%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-full w-8/12 rounded-full bg-primary" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t bg-foreground p-5 text-background md:border-s md:border-t-0">
              <span className="text-xl font-semibold leading-tight">
                Dùng thử Seev
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
