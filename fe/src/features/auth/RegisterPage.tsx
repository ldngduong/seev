import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'

import { AuthError } from './components/AuthError'
import { AuthField } from './components/AuthField'
import { AuthShell } from './components/AuthShell'
import { GoogleAuthButton } from './components/GoogleAuthButton'
import {
  registerSchema,
  type RegisterFormValues,
} from './schemas/auth.schemas'
import { useAuthStore } from './store/auth-store'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const register = useAuthStore((state) => state.register)
  const status = useAuthStore((state) => state.status)
  const storeError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const redirect = searchParams.get('redirect') || '/research-cv'
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

  useEffect(() => {
    clearError()
  }, [clearError])

  async function onSubmit(values: RegisterFormValues) {
    await register({
      ...values,
      username: values.username?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
    })
    navigate(redirect, { replace: true })
  }

  return (
    <AuthShell
      eyebrow="Start your workspace"
      title="Create your account"
      description="Save CV audits, track credits, and prepare job research with a consistent profile."
      footerText="Already have an account?"
      footerAction="Sign in"
      footerHref={`/login?redirect=${encodeURIComponent(redirect)}`}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <AuthError message={storeError} />
        <AuthField
          id="fullName"
          label="Full name"
          autoComplete="name"
          placeholder="Le Tung Duong"
          error={form.formState.errors.fullName?.message}
          {...form.register('fullName')}
        />
        <AuthField
          id="username"
          label="Username"
          autoComplete="username"
          placeholder="duongle"
          error={form.formState.errors.username?.message}
          {...form.register('username')}
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <AuthField
          id="phone"
          label="Phone"
          autoComplete="tel"
          placeholder="+84..."
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={status === 'loading' || form.formState.isSubmitting}
        >
          <UserPlus />
          Create account
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleAuthButton />
      </form>
    </AuthShell>
  )
}

export default RegisterPage
