import { create } from 'zustand'

import * as authApi from '../api/auth-api'
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from '../types/auth.types'
import { getApiErrorMessage } from '@/shared/lib/api-error'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'guest'

interface AuthState {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  hydrate: () => Promise<AuthUser | null>
  login: (payload: LoginPayload) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  hydrate: async () => {
    set({ status: 'loading', error: null })

    try {
      const user = await authApi.getMe()
      set({ user, status: 'authenticated', error: null })
      return user
    } catch {
      set({ user: null, status: 'guest', error: null })
      return null
    }
  },

  login: async (payload) => {
    set({ status: 'loading', error: null })

    try {
      const user = await authApi.login(payload)
      set({ user, status: 'authenticated', error: null })
      return user
    } catch (error) {
      const message = getApiErrorMessage(error)
      set({ user: null, status: 'guest', error: message })
      throw error
    }
  },

  register: async (payload) => {
    set({ status: 'loading', error: null })

    try {
      const user = await authApi.register(payload)
      set({ user, status: 'authenticated', error: null })
      return user
    } catch (error) {
      const message = getApiErrorMessage(error)
      set({ user: null, status: 'guest', error: message })
      throw error
    }
  },

  logout: async () => {
    await authApi.logout()
    set({ user: null, status: 'guest', error: null })
  },

  clearError: () => set({ error: null }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-expired', () => {
    useAuthStore.setState({ user: null, status: 'guest', error: null })
  })
}
