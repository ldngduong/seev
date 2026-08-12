import { ArrowUpRight, LayoutDashboard, LogOut, User } from 'lucide-react'
import { Link } from 'react-router'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'
import { useLandingNavigation } from '@/features/landing/hooks/use-landing-navigation'

const navigationItems = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Việc làm', to: '/viec-lam' },
  { label: 'Bảng giá', to: '/pricing' },
]

export const LandingNavigation = () => {
  const { isScrolled, user, logout } = useLandingNavigation()

  return (
    <header
      style={{ position: 'fixed', top: 0, right: 0, left: 0 }}
      className={cn(
        'z-[100] flex items-center justify-between px-4 py-3 transition-colors duration-300 sm:px-6 sm:py-4',
        isScrolled
          ? 'border-b bg-white/95 shadow-sm backdrop-blur'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        <img className="h-8" src="/logo.png" alt="" />
        <Link to="/" className="text-lg font-semibold tracking-normal sm:text-xl">
          Seev
        </Link>
      </div>

      <nav className="hidden items-center gap-1 rounded-4xl bg-primary p-2 md:flex">
        {navigationItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="rounded-4xl px-3 py-1 font-bold text-background transition-colors hover:bg-background hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {user ? (
        <Popover>
          <PopoverTrigger className="flex items-center gap-2 rounded-4xl bg-primary p-2 text-background outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/60">
            <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-background text-xs font-semibold text-foreground">
              <img
                src={user.avatar || '/avatar-default.svg'}
                alt=""
                referrerPolicy="no-referrer"
                className="size-full object-cover"
                onError={(event) => {
                  const image = event.currentTarget

                  if (image.src.endsWith('/avatar-default.svg')) {
                    return
                  }

                  image.src = '/avatar-default.svg'
                }}
              />
            </span>
            <span className="hidden max-w-36 truncate pr-2 text-sm font-semibold md:inline">
              {user.fullName}
            </span>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-56 gap-2 p-2">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <LayoutDashboard className="size-4" />
              Tổng quan
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <User className="size-4" />
              Hồ sơ
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </button>
          </PopoverContent>
        </Popover>
      ) : (
        <Link to="/login" className="rounded-4xl bg-primary p-1.5 sm:p-2">
          <span className="flex items-center gap-1 whitespace-nowrap rounded-4xl px-2 py-1 text-sm font-bold text-background hover:bg-background hover:text-foreground sm:px-3 sm:text-base">
            Dùng thử Seev
            <ArrowUpRight />
          </span>
        </Link>
      )}
    </header>
  )
}
