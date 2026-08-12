import type { ReactNode } from 'react'

import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'

export function AdminPage({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <main className="flex w-full flex-col gap-5">
    <div><DashboardPageHeader title={title} actions={actions} />{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}</div>
    {children}
  </main>
}

export function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <div className="rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/30">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-800 tabular-nums">{value}</p>
    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
  </div>
}
