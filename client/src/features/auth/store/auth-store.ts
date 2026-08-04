import { create } from 'zustand'

import * as authApi from '../api/auth-api'
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from '../types/auth.types'

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

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = error.response.data as { message?: unknown }

    if (typeof data.message === 'string') {
      return data.message
    }

    if (Array.isArray(data.message)) {
      return data.message.join(', ')
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
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
      const message = getErrorMessage(error)
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
      const message = getErrorMessage(error)
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
