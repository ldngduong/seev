import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'

import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas'
import { useAuthStore } from '../store/auth-store'

export function useLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useAuthStore((state) => state.login)
  const status = useAuthStore((state) => state.status)
  const storeError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const redirect = searchParams.get('redirect') || '/research-cv'
  const googleError =
    searchParams.get('error') === 'google_auth_failed'
      ? 'Google đăng nhập chưa hoàn tất.'
      : null
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => clearError(), [clearError])

  const onSubmit = form.handleSubmit(async (values) => {
    await login(values)
    navigate(redirect, { replace: true })
  })

  return {
    form,
    onSubmit,
    redirect,
    error: storeError || googleError,
    isSubmitting: status === 'loading' || form.formState.isSubmitting,
  }
}
