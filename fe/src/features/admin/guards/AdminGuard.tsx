import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/features/auth/store/auth-store'

export function AdminGuard() {
  const location = useLocation()
  const { hydrate, status, user } = useAuthStore()
  useEffect(() => { if (status === 'idle') void hydrate() }, [hydrate, status])
  if (status === 'idle' || status === 'loading') return <div className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" /></div>
  if (status === 'guest') return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
