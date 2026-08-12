import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/shared/lib/api-error'

import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas'
import { useAuthStore } from '../store/auth-store'

export function useLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useAuthStore((state) => state.login)
  const status = useAuthStore((state) => state.status)
  const clearError = useAuthStore((state) => state.clearError)
  const redirect = searchParams.get('redirect') || '/dashboard'
  const googleError =
    searchParams.get('error') === 'google_auth_failed'
      ? 'Google đăng nhập chưa hoàn tất.'
      : null
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => clearError(), [clearError])
  useEffect(() => { if (googleError) toast.error(googleError) }, [googleError])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values)
      toast.success('Đăng nhập thành công.')
      navigate(redirect, { replace: true })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Email hoặc mật khẩu không đúng.'))
    }
  }, (errors) => toast.error(Object.values(errors)[0]?.message ?? 'Kiểm tra lại thông tin đăng nhập.'))

  return {
    form,
    onSubmit,
    redirect,
    isSubmitting: status === 'loading' || form.formState.isSubmitting,
  }
}
