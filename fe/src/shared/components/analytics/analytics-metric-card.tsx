import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'

export function AnalyticsMetricCard({ icon: Icon, label, value, detail, change }: { icon: LucideIcon; label: string; value: string | number; detail: string; change?: number | null }) {
  const ChangeIcon = change === 0 ? Minus : change != null && change > 0 ? ArrowUpRight : ArrowDownRight
  return <article className="h-full rounded-2xl border border-border/60 bg-card p-5">
    <div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span>{change != null ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${change === 0 ? 'bg-muted text-muted-foreground' : change > 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-600'}`}><ChangeIcon className="size-3" />{Math.abs(change)}%</span> : null}</div>
    <p className="mt-5 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-800 tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>
  </article>
}
