import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'

import {
  registerSchema,
  type RegisterFormValues,
} from '../schemas/auth.schemas'
import { useAuthStore } from '../store/auth-store'

export function useRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const register = useAuthStore((state) => state.register)
  const status = useAuthStore((state) => state.status)
  const storeError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const redirect = searchParams.get('redirect') || '/dashboard'
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      phone: '',
    },
  })

  useEffect(() => clearError(), [clearError])

  const onSubmit = form.handleSubmit(async (values) => {
    await register({
      ...values,
      username: values.username?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
    })
    navigate(redirect, { replace: true })
  })

  return {
    form,
    onSubmit,
    redirect,
    error: storeError,
    isSubmitting: status === 'loading' || form.formState.isSubmitting,
  }
}
