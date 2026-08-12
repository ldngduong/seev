import type { ExternalQuota } from '../types/admin.types'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function valueOf(data: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (data[key] !== undefined && data[key] !== null) return String(data[key])
  return '—'
}

function FirecrawlQuota({ data }: { data: Record<string, unknown> }) {
  return <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
    <QuotaMetric label="Credit còn lại" value={valueOf(data, 'remainingCredits', 'remaining_credits')} />
    <QuotaMetric label="Credit gói" value={valueOf(data, 'planCredits', 'plan_credits')} />
    <QuotaMetric label="Đầu kỳ" value={valueOf(data, 'billingPeriodStart', 'billing_period_start')} />
    <QuotaMetric label="Cuối kỳ" value={valueOf(data, 'billingPeriodEnd', 'billing_period_end')} />
  </div>
}

function DeepseekQuota({ data }: { data: Record<string, unknown> }) {
  const balances = Array.isArray(data.balance_infos) ? data.balance_infos.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)) : []
  return <div className="mt-4 grid gap-3 text-sm">
    <p className="text-muted-foreground">API hiện tại: <strong className="text-foreground">{data.is_available === true ? 'Có thể sử dụng' : 'Không khả dụng'}</strong></p>
    {balances.map((balance, index) => <div key={`${String(balance.currency)}-${index}`} className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3">
      <QuotaMetric label="Tiền tệ" value={valueOf(balance, 'currency')} />
      <QuotaMetric label="Tổng số dư" value={valueOf(balance, 'total_balance')} />
      <QuotaMetric label="Số dư nạp" value={valueOf(balance, 'topped_up_balance')} />
    </div>)}
  </div>
}

function QuotaMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>
}

export function ExternalQuotaCard({ quota }: { quota: ExternalQuota }) {
  const available = quota.status === 'available' && quota.data
  return <article className="h-full rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/30">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-semibold">{quota.provider === 'deepseek' ? 'DeepSeek' : 'Firecrawl'}</h3>
      <span className={quota.status === 'available' ? 'text-sm text-emerald-600' : 'text-sm text-amber-600'}>{quota.status === 'available' ? 'Đang hoạt động' : quota.status === 'unconfigured' ? 'Chưa cấu hình khóa API' : 'Không lấy được dữ liệu'}</span>
    </div>
    {available ? quota.provider === 'deepseek' ? <DeepseekQuota data={quota.data!} /> : <FirecrawlQuota data={quota.data!} /> : <p className="mt-3 text-sm text-muted-foreground">{quota.error || 'Thêm khóa API trong cấu hình máy chủ để xem hạn mức.'}</p>}
  </article>
}
