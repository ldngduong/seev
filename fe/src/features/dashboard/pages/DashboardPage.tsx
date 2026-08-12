import { ArrowRight, CheckCircle2, FileText, Gauge, WalletCards } from 'lucide-react'
import { Link } from 'react-router'

import { useAuthStore } from '@/features/auth/store/auth-store'
import { AnalyticsMetricCard } from '@/shared/components/analytics/analytics-metric-card'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { RecentResearches } from '../components/recent-researches'
import { ServiceUsageChart } from '../components/service-usage-chart'
import { UserResearchChart } from '../components/user-research-chart'
import { useDashboard } from '../hooks/use-dashboard'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const { dashboard, isLoading, isError } = useDashboard()
  const summary = dashboard?.summary
  const firstName = user?.fullName.trim().split(/\s+/).at(-1)
  const usedServices = dashboard?.service_breakdown ?? []

  return <main className="flex flex-col gap-5">
    <div><DashboardPageHeader title={firstName ? `Chào ${firstName}` : 'Tổng quan'} actions={<Link to="/research/new" className={cn(buttonVariants())}>Research mới<ArrowRight className="size-4" /></Link>} /><p className="mt-1 text-sm text-muted-foreground">Tổng quan hoạt động của bạn trong 30 ngày gần nhất.</p></div>
    {isError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">Không tải được dữ liệu tổng quan.</div> : null}
    <section className="grid grid-cols-12 gap-3">
      <div className="col-span-12 sm:col-span-6 xl:col-span-3"><AnalyticsMetricCard icon={WalletCards} label="Số dư" value={summary ? `${summary.balance} credit` : isLoading ? '...' : '0 credit'} detail={summary ? `Đã dùng ${summary.credits_used_30d} credit trong tháng` : 'Số credit có thể sử dụng'} /></div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3"><AnalyticsMetricCard icon={CheckCircle2} label="Research hoàn tất" value={summary?.completed_30d ?? (isLoading ? '...' : 0)} detail={`${summary?.researches_30d ?? 0} phiên được tạo trong 30 ngày`} /></div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3"><AnalyticsMetricCard icon={Gauge} label="Tỷ lệ thành công" value={summary?.success_rate == null ? '—' : `${summary.success_rate}%`} detail={summary?.failed_30d ? `${summary.failed_30d} phiên cần chạy lại` : 'Không có phiên lỗi trong kỳ'} /></div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3"><AnalyticsMetricCard icon={FileText} label="CV đã lưu" value={summary?.cv_count ?? (isLoading ? '...' : 0)} detail={summary?.active_researches ? `${summary.active_researches} phiên đang xử lý` : 'Sẵn sàng cho lần research tiếp theo'} /></div>
      <article className="col-span-12 rounded-2xl border border-border/60 bg-card p-5 xl:col-span-8"><div><h2 className="font-semibold text-zinc-800">Kết quả research</h2><p className="mt-1 text-sm text-muted-foreground">Các ngày có phiên hoàn tất hoặc bị lỗi trong 30 ngày gần nhất.</p></div><div className="mt-3"><UserResearchChart data={dashboard?.trend ?? []} /></div></article>
      <article className="col-span-12 rounded-2xl border border-border/60 bg-card p-5 xl:col-span-4"><div><h2 className="font-semibold text-zinc-800">Dịch vụ đã dùng</h2><p className="mt-1 text-sm text-muted-foreground">Cơ cấu sử dụng trong 30 ngày.</p></div><div className="mt-3"><ServiceUsageChart data={usedServices} /></div></article>
      <div className="col-span-12"><RecentResearches sessions={dashboard?.recent_researches ?? []} /></div>
    </section>
  </main>
}
