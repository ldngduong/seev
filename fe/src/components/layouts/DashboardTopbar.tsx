import { LayoutDashboard, LogOut, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter'
import { useAuthStore } from '@/features/auth/store/auth-store'

export function DashboardTopbar() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-[var(--content-pad)] [--content-pad:1rem] sm:[--content-pad:1.25rem] lg:[--content-pad:1.5rem]">
      <SidebarTrigger className="size-9 rounded-xl text-zinc-700" />
      <div className="flex items-center gap-1">
        <NotificationCenter />
        {user ? (
          <Popover>
            <PopoverTrigger className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-zinc-700 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60">
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                <img
                  src={user.avatar || '/avatar-default.svg'}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                  onError={(event) => {
                    if (!event.currentTarget.src.endsWith('/avatar-default.svg')) {
                      event.currentTarget.src = '/avatar-default.svg'
                    }
                  }}
                />
              </span>
              <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">
                {user.fullName}
              </span>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-56 gap-1 rounded-xl p-2">
              <div className="border-b px-3 py-2">
                <p className="truncate text-sm font-semibold text-zinc-700">{user.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <AccountLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
              <AccountLink to="/my-cvs" icon={UserRound} label="My CVs" />
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-muted"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </header>
  )
}

function AccountLink({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof LayoutDashboard
  label: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-muted"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  )
}
