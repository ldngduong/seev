import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

const footerLinks = [
  { label: 'Việc làm', href: '/viec-lam' },
  { label: 'Bảng giá', href: '/pricing' },
  { label: 'Đăng nhập', href: '/login' },
]

export function LandingFooter() {
  return (
    <footer className="mx-6 overflow-hidden rounded-t-4xl bg-primary text-primary-foreground">
      <div className="flex flex-col gap-6 px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background"><img className="h-6" src="/logo.png" alt="" /></span>
          <div className="min-w-0">
            <p className="text-lg font-semibold">Seev</p>
            <p className="text-sm text-primary-foreground/70">Phân tích CV và việc làm dành riêng cho ngành CNTT.</p>
          </div>
        </div>

        <nav aria-label="Liên kết cuối trang" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {footerLinks.map((item) => <Link key={item.label} to={item.href} className="text-sm text-primary-foreground/75 transition-colors hover:text-primary-foreground">{item.label}</Link>)}
        </nav>

        <Link to="/register" className={cn(buttonVariants({ variant: 'secondary' }), 'shrink-0')}>
          Tạo tài khoản
          <ArrowUpRight />
        </Link>
      </div>
      <div className="flex flex-col gap-2 border-t border-primary-foreground/15 px-6 py-3 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <span>© {new Date().getFullYear()} Seev</span>
        <span>CV rõ hơn. Công việc đúng hơn.</span>
      </div>
    </footer>
  )
}
