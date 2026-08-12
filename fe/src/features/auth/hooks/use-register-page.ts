import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/shared/lib/api-error'

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
    try {
      await register({
        ...values,
        username: values.username?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
      })
      toast.success('Tạo tài khoản thành công.')
      navigate(redirect, { replace: true })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tạo tài khoản.'))
    }
  }, (errors) => toast.error(Object.values(errors)[0]?.message ?? 'Kiểm tra lại thông tin đăng ký.'))

  return {
    form,
    onSubmit,
    redirect,
    isSubmitting: status === 'loading' || form.formState.isSubmitting,
  }
}
