import { ArrowRight, BriefcaseBusiness, FileText, History } from 'lucide-react'
import { Link } from 'react-router'

import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const shortcuts = [
  {
    to: '/my-cvs',
    icon: FileText,
    title: 'Thư viện CV',
    description: 'Tải lên và tái sử dụng CV đã lưu cho research nhanh hoặc theo yêu cầu.',
  },
  {
    to: '/research-history',
    icon: History,
    title: 'Lịch sử research',
    description: 'Mở lại các phiên đã hoàn tất với bản audit gốc.',
  },
  {
    to: '/research/new',
    icon: BriefcaseBusiness,
    title: 'Research mới',
    description: 'So sánh CV với nhóm ngành, cấp bậc hoặc mô tả công việc để tìm việc phù hợp.',
  },
]

export function DashboardPage() {
  return (
    <main className="flex flex-col gap-4">
      <DashboardPageHeader
        title="Tổng quan"
        actions={
          <Link
            to="/research/new"
            className={cn(buttonVariants())}
          >
            Research mới
            <ArrowRight className="size-4" />
          </Link>
        }
      />
      <section className="grid gap-3 md:grid-cols-3">
        {shortcuts.map(({ to, icon: Icon, title, description }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col gap-6 rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-zinc-800">{title}</span>
              <span className="text-sm leading-6 text-muted-foreground">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
