import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'

import { AuthError } from './components/AuthError'
import { AuthField } from './components/AuthField'
import { AuthShell } from './components/AuthShell'
import { GoogleAuthButton } from './components/GoogleAuthButton'
import { loginSchema, type LoginFormValues } from './schemas/auth.schemas'
import { useAuthStore } from './store/auth-store'

const LoginPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useAuthStore((state) => state.login)
  const status = useAuthStore((state) => state.status)
  const storeError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const redirect = searchParams.get('redirect') || '/research-cv'
  const googleError =
    searchParams.get('error') === 'google_auth_failed'
      ? 'Google sign in was not completed.'
      : null
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    clearError()
  }, [clearError])

  async function onSubmit(values: LoginFormValues) {
    await login(values)
    navigate(redirect, { replace: true })
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Seev"
      description="Review CV fit, keep your research history, and continue matching jobs from your workspace."
      footerText="New to Seev?"
      footerAction="Create an account"
      footerHref={`/register?redirect=${encodeURIComponent(redirect)}`}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <AuthError message={storeError || googleError} />
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
          autoComplete="current-password"
          placeholder="Your password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={status === 'loading' || form.formState.isSubmitting}
        >
          <LogIn />
          Sign in
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

export default LoginPage
