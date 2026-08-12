import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type DashboardPageHeaderProps = {
  title: ReactNode
  actions?: ReactNode
  className?: string
}

export function DashboardPageHeader({
  title,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {typeof title === 'string' ? (
          <h1 className="break-words text-xl font-semibold tracking-tight text-zinc-800 sm:text-2xl">
            {title}
          </h1>
        ) : (
          title
        )}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">{actions}</div>
      ) : null}
    </header>
  )
}
