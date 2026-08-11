import type { PropsWithChildren } from 'react'
import { Link } from 'react-router'

import { LandingNavigation } from '@/features/landing/components/LandingNavigation'

interface AuthShellProps extends PropsWithChildren {
  eyebrow: string
  title: string
  description: string
  footerText: string
  footerAction: string
  footerHref: string
}

export function AuthShell({
  children,
  description,
  eyebrow,
  footerAction,
  footerHref,
  footerText,
  title,
}: AuthShellProps) {
  return (
    <>
      <LandingNavigation />
      <main className="grid min-h-screen place-items-center bg-[#f8fafc] p-6 pt-24">
        <section className="w-full max-w-[440px] rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-7 space-y-3">
            <Link
              to="/"
              className="inline-flex text-sm font-semibold tracking-tight"
            >
              Seev
            </Link>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {eyebrow}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {title}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {children}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footerText}{' '}
            <Link to={footerHref} className="font-medium text-foreground">
              {footerAction}
            </Link>
          </p>
        </section>
      </main>
    </>
  )
}
