import { UserPlus } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

import { AuthError } from '../components/AuthError'
import { AuthField } from '../components/AuthField'
import { AuthShell } from '../components/AuthShell'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { useRegisterPage } from '../hooks/use-register-page'

const RegisterPage = () => {
  const { form, onSubmit, redirect, error, isSubmitting } = useRegisterPage()

  return (
    <AuthShell
      eyebrow="Bắt đầu không gian làm việc"
      title="Tạo tài khoản của bạn"
      description="Lưu lịch sử research CV, theo dõi và chuẩn bị nghiên cứu việc làm với hồ sơ nhất quán."
      footerText="Đã có tài khoản?"
      footerAction="Đăng nhập"
      footerHref={`/login?redirect=${encodeURIComponent(redirect)}`}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <AuthError message={error} />
        <AuthField
          id="fullName"
          label="Họ và tên"
          autoComplete="name"
          placeholder="Nguyễn Văn An"
          error={form.formState.errors.fullName?.message}
          {...form.register('fullName')}
        />
        <AuthField
          id="username"
          label="Tên đăng nhập"
          autoComplete="username"
          placeholder="nguyenvana"
          error={form.formState.errors.username?.message}
          {...form.register('username')}
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <AuthField
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          placeholder="Ít nhất 8 ký tự"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <AuthField
          id="phone"
          label="Số điện thoại"
          autoComplete="tel"
          placeholder="+84..."
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          <UserPlus />
          Tạo tài khoản
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          hoặc
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleAuthButton />
      </form>
    </AuthShell>
  )
}

export default RegisterPage
