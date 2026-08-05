import { useEffect } from 'react'
import { Navigate, Outlet, useSearchParams } from 'react-router'

import { useAuthStore } from '../store/auth-store'

export function GuestGuard() {
  const [searchParams] = useSearchParams()
  const { hydrate, status } = useAuthStore()
  const redirect = searchParams.get('redirect') || '/research-cv'

  useEffect(() => {
    if (status === 'idle') {
      void hydrate()
    }
  }, [hydrate, status])

  if (status === 'idle' || status === 'loading') {
    return <GuestRouteFallback />
  }

  if (status === 'authenticated') {
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

function GuestRouteFallback() {
  return (
    <div className="grid min-h-[60svh] place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  )
}
