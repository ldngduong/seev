import { Activity, Coins, RefreshCw, SearchCheck, Users } from 'lucide-react'

import { AnalyticsMetricCard } from '@/shared/components/analytics/analytics-metric-card'
import { Button } from '@/shared/components/ui/button'
import { AdminCreditChart } from '../components/admin-credit-chart'
import { AdminGrowthChart } from '../components/admin-growth-chart'
import { AdminPage } from '../components/admin-page'
import { AdminServiceBreakdown } from '../components/admin-service-breakdown'
import { ExternalQuotaCard } from '../components/external-quota-card'
import { LatestCrawlSummary } from '../components/latest-crawl-summary'
import { NewAccountCreditsCard } from '../components/new-account-credits-card'
import { useAdminDashboard } from '../hooks/use-admin-dashboard'

export function AdminDashboardPage() {
  const state = useAdminDashboard()
  const dashboard = state.dashboard
  const summary = dashboard?.summary

  return <AdminPage title="Tổng quan" description="Hiệu quả kinh doanh và tình trạng vận hành trong 30 ngày gần nhất.">
    <section className="grid grid-cols-12 items-stretch gap-3">
      <div className="col-span-12 h-full [&>*]:h-full sm:col-span-6 xl:col-span-3"><AnalyticsMetricCard icon={Users} label="Người dùng mới" value={summary?.new_users_30d ?? (state.isLoading ? '...' : 0)} detail={`${summary?.users ?? 0} người dùng toàn hệ thống`} change={summary?.user_growth} /></div>
      <div className="col-span-12 h-full [&>*]:h-full sm:col-span-6 xl:col-span-3"><AnalyticsMetricCard icon={SearchCheck} label="Phiên nghiên cứu" value={summary?.researches_30d ?? (state.isLoading ? '...' : 0)} detail={`${summary?.researches ?? 0} phiên từ trước đến nay`} change={summary?.research_growth} /></div>
      <div className="col-span-12 h-full [&>*]:h-full sm:col-span-6 xl:col-span-3"><AnalyticsMetricCard icon={Activity} label="Tỷ lệ thành công" value={summary?.success_rate == null ? '—' : `${summary.success_rate}%`} detail={summary?.failed_30d ? `${summary.failed_30d} phiên bị lỗi trong kỳ` : 'Không có phiên lỗi trong kỳ'} /></div>
      <div className="col-span-12 h-full [&>*]:h-full sm:col-span-6 xl:col-span-3"><AnalyticsMetricCard icon={Coins} label="Credit tiêu thụ" value={summary?.consumed_credits_30d ?? (state.isLoading ? '...' : '0')} detail="Đã ghi nhận thanh toán dịch vụ" change={summary?.credit_growth} /></div>
      <article className="col-span-12 flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 xl:col-span-8"><div><h2 className="font-semibold text-zinc-800">Tăng trưởng sử dụng</h2><p className="mt-1 text-sm text-muted-foreground">Người dùng mới và số phiên nghiên cứu theo ngày.</p></div><div className="mt-3 flex-1"><AdminGrowthChart data={dashboard?.trend ?? []} /></div></article>
      <article className="col-span-12 flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 xl:col-span-4"><div><h2 className="font-semibold text-zinc-800">Credit theo ngày</h2><p className="mt-1 text-sm text-muted-foreground">Credit được tiêu thụ bởi các phiên hoàn tất.</p></div><div className="mt-3 flex-1"><AdminCreditChart data={dashboard?.trend ?? []} /></div></article>
      <div className="col-span-12 h-full [&>*]:h-full xl:col-span-4"><AdminServiceBreakdown services={dashboard?.service_breakdown ?? []} /></div>
      <div className="col-span-12 h-full [&>*]:h-full xl:col-span-4"><LatestCrawlSummary run={dashboard?.latest_crawl ?? null} /></div>
      <div className="col-span-12 h-full [&>*]:h-full xl:col-span-4"><NewAccountCreditsCard setting={state.newAccountCredits} isSaving={state.isSavingNewAccountCredits} onSave={state.saveNewAccountCredits} /></div>
      <div className="col-span-12 mt-2 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-zinc-800">Hạn mức nhà cung cấp</h2><p className="mt-1 text-sm text-muted-foreground">Theo dõi khả năng xử lý và chi phí dịch vụ bên ngoài.</p></div><Button size="sm" variant="ghost" onClick={() => void state.refreshQuotas()} disabled={state.isRefreshingQuotas}><RefreshCw />Làm mới</Button></div>
      {state.quotas.map((quota) => <div key={quota.provider} className="col-span-12 h-full [&>*]:h-full md:col-span-6"><ExternalQuotaCard quota={quota} /></div>)}
    </section>
  </AdminPage>
}
