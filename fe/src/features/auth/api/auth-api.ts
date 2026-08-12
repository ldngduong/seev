import { apiClient } from '@/shared/lib/api-client'

import type {
  AuthSessionResponse,
  LoginPayload,
  RegisterPayload,
} from '../types/auth.types'

export async function getMe() {
  const { data } = await apiClient.get<AuthSessionResponse>('/auth/me')
  return data.user
}

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<AuthSessionResponse>(
    '/auth/login',
    payload,
  )
  return data.user
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<AuthSessionResponse>(
    '/auth/register',
    payload,
  )
  return data.user
}

export async function logout() {
  await apiClient.post('/auth/logout')
}

export function getGoogleAuthUrl() {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  return `${baseUrl.replace(/\/$/, '')}/auth/google`
}
