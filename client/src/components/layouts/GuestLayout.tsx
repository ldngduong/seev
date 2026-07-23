import { Outlet } from 'react-router'

export function GuestLayout() {
  return (
    <div className="min-h-svh bg-background p-4 text-foreground [--page-pad:0.5rem] sm:[--page-pad:0.75rem] lg:[--page-pad:1rem]">
      <Outlet />
    </div>
  )
}
