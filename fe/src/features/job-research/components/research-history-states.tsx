import { BriefcaseBusiness } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'

export function ResearchHistorySkeleton() {
  return <>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}</>
}

export function EmptyResearchHistory() {
  return <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center"><BriefcaseBusiness className="size-8 text-muted-foreground" /><div className="space-y-1"><h2 className="text-lg font-semibold text-zinc-800">Chưa có research nào</h2><p className="text-sm text-muted-foreground">Chọn một CV và bắt đầu research đầu tiên.</p></div><Link to="/research/new" className={cn(buttonVariants())}>Research mới</Link></section>
}
