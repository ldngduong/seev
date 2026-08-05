import { useEffect, useState } from 'react'
import { ArrowUpRight, LayoutDashboard, LogOut, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/store/auth-store'

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Explore', to: '/#product' },
]

export const LandingNavigation = () => {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const { hydrate, logout, status, user } = useAuthStore()

  useEffect(() => {
    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 8)
    }

    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })

    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  useEffect(() => {
    if (status === 'idle') {
      void hydrate()
    }
  }, [hydrate, status])

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <header
      style={{ position: 'fixed', top: 0, right: 0, left: 0 }}
      className={cn(
        'z-[100] flex items-center justify-between px-6 py-4 transition-colors duration-300',
        isScrolled
          ? 'border-b bg-white/95 shadow-sm backdrop-blur'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        <img className="h-8" src="/logo.png" alt="" />
        <Link to="/" className="text-xl font-semibold tracking-normal">
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
              Dashboard
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <User className="size-4" />
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </PopoverContent>
        </Popover>
      ) : (
        <Link to="/login" className="rounded-4xl bg-primary p-2">
          <span className="flex items-center gap-1 rounded-4xl px-3 py-1 font-bold text-background hover:bg-background hover:text-foreground">
            Try Seev
            <ArrowUpRight />
          </span>
        </Link>
      )}
    </header>
  )
}
