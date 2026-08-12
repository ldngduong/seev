import { LogIn } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

import { AuthField } from '../components/AuthField'
import { AuthShell } from '../components/AuthShell'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { useLoginPage } from '../hooks/use-login-page'

const LoginPage = () => {
  const { form, onSubmit, redirect, isSubmitting } = useLoginPage()

  return (
    <AuthShell
      eyebrow="Chào mừng trở lại"
      title="Đăng nhập vào Seev"
      description="Xem mức độ phù hợp của CV, lưu lịch sử research và tiếp tục tìm việc khớp với hồ sơ của bạn."
      footerText="Chưa có tài khoản Seev?"
      footerAction="Tạo tài khoản"
      footerHref={`/register?redirect=${encodeURIComponent(redirect)}`}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          {...form.register('email')}
        />
        <AuthField
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          placeholder="Mật khẩu của bạn"
          {...form.register('password')}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          <LogIn />
          Đăng nhập
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

export default LoginPage
