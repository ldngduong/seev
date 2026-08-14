import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Check } from 'lucide-react'
import { Link } from 'react-router'

import { getBillingCatalog } from '@/features/billing/api/billing-api'
import type { BillingProduct } from '@/features/billing/types/billing.types'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { LandingFooter } from '../components/LandingFooter'
import { LandingNavigation } from '../components/LandingNavigation'

const productBenefits: Record<BillingProduct['code'], string[]> = {
  quick_research: ['Tự nhận diện mảng CNTT phù hợp', 'Nhận xét trực tiếp trên CV', 'Gợi ý việc làm theo hồ sơ'],
  manual_research: ['Chọn mảng và mức kinh nghiệm', 'Lọc theo địa điểm mong muốn', 'Nhận xét CV theo mục tiêu đã chọn'],
  job_fit_analysis: ['So sánh một CV với một việc làm', 'Chỉ rõ điểm phù hợp và còn thiếu', 'Gợi ý việc cần làm trước khi ứng tuyển'],
  external_jd_research: ['Dán nội dung hoặc tải tệp JD', 'Hỗ trợ PDF, Word và TXT', 'Đối chiếu yêu cầu với bằng chứng trong CV'],
  external_link_research: ['Đọc trang việc làm hoặc bài tuyển dụng', 'Lọc nội dung trước khi đánh giá', 'Đối chiếu yêu cầu với bằng chứng trong CV'],
  job_suggestion_retry: ['Giữ nguyên kết quả đánh giá CV', 'Tìm lại việc làm từ dữ liệu mới nhất', 'Cập nhật danh sách việc làm phù hợp'],
}

export function PricingPage() {
  const catalog = useQuery({ queryKey: ['billing', 'catalog'], queryFn: getBillingCatalog, staleTime: 60_000 })
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <LandingNavigation />
      <main className="px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-primary">Bảng giá</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl md:text-6xl">Chỉ trả credit cho lần bạn sử dụng</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">Không cần đăng ký gói tháng. Credit chỉ được trừ khi bạn bắt đầu sử dụng một dịch vụ.</p>
        </section>

        {catalog.isLoading ? <div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-96 animate-pulse rounded-3xl bg-muted" />)}</div> : null}
        {catalog.data ? <section className="mx-auto mt-12 grid max-w-7xl items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{catalog.data.map((product) => <PricingCard key={product.id} product={product} />)}</section> : null}
      </main>
      <LandingFooter />
    </div>
  )
}

function PricingCard({ product }: { product: BillingProduct }) {
  const featured = product.code === 'quick_research'
  return (
    <article className={cn('relative flex min-h-96 flex-col rounded-3xl border bg-card p-5 sm:p-6', featured ? 'border-primary shadow-lg shadow-primary/10' : 'border-border/70')}>
      <div>
        <h2 className={cn('text-xl font-semibold text-zinc-900', featured && 'pr-24')}>{product.name}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description}</p>
        {featured ? <span className="absolute right-6 top-6 whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Phổ biến</span> : null}
      </div>
      <div className="mt-7 flex items-end gap-2"><strong className="text-5xl font-semibold tracking-tight text-zinc-900">{product.price_credits}</strong><span className="pb-1.5 text-sm text-muted-foreground">credit / lượt</span></div>
      <ul className="mt-7 space-y-3">{productBenefits[product.code].map((benefit) => <li key={benefit} className="flex gap-2 text-sm text-zinc-700"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{benefit}</li>)}</ul>
      <Link to="/register" className={cn(buttonVariants({ variant: featured ? 'default' : 'outline' }), 'mt-auto w-full')}>Tạo tài khoản<ArrowUpRight /></Link>
    </article>
  )
}
