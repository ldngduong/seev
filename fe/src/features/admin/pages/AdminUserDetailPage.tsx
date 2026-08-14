import { History, WalletCards, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { DataPagination } from '@/shared/components/data/DataPagination'
import { AdminPage, MetricCard } from '../components/admin-page'
import { useAdminUserDetail } from '../hooks/use-admin-user-detail'
import { describeActivity, formatActivityAction, formatTransactionType } from '../utils/admin-formatters'

export function AdminUserDetailPage() {
  const state = useAdminUserDetail()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const detail = state.detail

  if (state.isLoading) return <AdminPage title="Người dùng"><p className="text-sm text-muted-foreground">Đang tải thông tin...</p></AdminPage>
  if (!detail) return <AdminPage title="Không tìm thấy người dùng"><span /></AdminPage>

  return <AdminPage title={detail.user.fullName} description={detail.user.email}>
    <section className="grid gap-3 sm:grid-cols-3">
      <MetricCard label="Số dư hiện tại" value={`${detail.account.balance} credit`} />
      <MetricCard label="Phiên nghiên cứu" value={detail.summary.sessions} />
      <MetricCard label="CV đã lưu" value={detail.summary.cvs} />
    </section>

    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><WalletCards className="size-5" /></span><div><h2 className="font-semibold text-zinc-800">Điều chỉnh số dư</h2><p className="mt-0.5 text-sm text-muted-foreground">Nhập số dương để cộng, số âm để trừ credit.</p></div></div>
      <div className="mt-4 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]">
        <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ví dụ: 100 hoặc -20" />
        <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do điều chỉnh" />
        <Button disabled={!amount || reason.trim().length < 3 || state.isAdjusting} onClick={() => state.adjust({ amount: Number(amount), reason: reason.trim() })}>Xác nhận</Button>
      </div>
    </section>

    <section className="grid gap-3 lg:grid-cols-2">
      <HistoryPanel icon={WalletCards} title="Lịch sử credit" empty="Chưa có giao dịch credit." hasItems={Boolean(state.creditHistory?.items.length)}>
        {state.creditHistory?.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
          <div className="min-w-0"><p className="text-sm font-medium text-zinc-800">{formatTransactionType(item.type)}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{item.reason || new Date(item.created_at).toLocaleString('vi-VN')}</p></div>
          <div className="shrink-0 text-right"><p className={`text-sm font-semibold tabular-nums ${Number(item.amount_delta) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{Number(item.amount_delta) >= 0 ? '+' : ''}{item.amount_delta}</p><p className="text-xs text-muted-foreground">Số dư {item.balance_after}</p></div>
        </div>)}
        {state.creditHistory ? <DataPagination page={state.creditHistory.meta.page} totalPages={state.creditHistory.meta.total_pages} total={state.creditHistory.meta.total} onPageChange={state.setCreditPage} /> : null}
      </HistoryPanel>
      <HistoryPanel icon={History} title="Hoạt động gần đây" empty="Chưa có hoạt động." hasItems={Boolean(state.activities?.items.length)}>
        {state.activities?.items.map((item) => { const description = describeActivity(item); return <div key={item.id} className="border-b border-border/60 py-3 last:border-0"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm font-medium text-zinc-800">{formatActivityAction(item.action)}</p>{description ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p> : null}</div><time className="shrink-0 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('vi-VN')}</time></div></div> })}
        {state.activities ? <DataPagination page={state.activities.meta.page} totalPages={state.activities.meta.total_pages} total={state.activities.meta.total} onPageChange={state.setActivityPage} /> : null}
      </HistoryPanel>
    </section>
  </AdminPage>
}

function HistoryPanel({ icon: Icon, title, empty, children, hasItems }: { icon: LucideIcon; title: string; empty: string; children: ReactNode; hasItems: boolean }) {
  return <section className="rounded-2xl border border-border/60 bg-card p-5"><div className="mb-2 flex items-center gap-2"><Icon className="size-4 text-primary" /><h2 className="font-semibold text-zinc-800">{title}</h2></div>{hasItems ? children : <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>}</section>
}
