import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useAuthStore } from '../store/auth-store'

export function GoogleSuccessGuard() {
  const hydrate = useAuthStore((state) => state.hydrate)
  const status = useAuthStore((state) => state.status)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    async function hydrateSession() {
      const user = await hydrate()

      if (mounted && user) {
        navigate('/dashboard', { replace: true })
      }
    }

    void hydrateSession()

    return () => {
      mounted = false
    }
  }, [hydrate, navigate])

  if (status === 'guest') {
    return <Navigate to="/login?error=google_auth_failed" replace />
  }

  return (
    <div className="grid min-h-[60svh] place-items-center">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <p className="text-sm text-muted-foreground">Đang hoàn tất đăng nhập Google</p>
      </div>
    </div>
  )
}
