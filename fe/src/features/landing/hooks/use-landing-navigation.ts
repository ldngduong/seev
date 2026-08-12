import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthStore } from '@/features/auth/store/auth-store'

export function useLandingNavigation() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const { hydrate, logout, status, user } = useAuthStore()

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8)
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])
  useEffect(() => {
    if (status === 'idle') void hydrate()
  }, [hydrate, status])

  return {
    isScrolled,
    user,
    logout: async () => {
      await logout()
      navigate('/', { replace: true })
    },
  }
}
