import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuthStore } from '../store/auth-store'

export function AuthGuard() {
  const location = useLocation()
  const { hydrate, status } = useAuthStore()

  useEffect(() => {
    if (status === 'idle') {
      void hydrate()
    }
  }, [hydrate, status])

  if (status === 'idle' || status === 'loading') {
    return <AuthRouteFallback />
  }

  if (status === 'guest') {
    const redirect = `${location.pathname}${location.search}`

    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  return <Outlet />
}

function AuthRouteFallback() {
  return (
    <div className="grid min-h-[60svh] place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  )
}
