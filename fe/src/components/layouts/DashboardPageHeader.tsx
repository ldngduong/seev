import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

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
        'flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {typeof title === 'string' ? (
          <h1 className="truncate text-3xl font-semibold tracking-normal text-zinc-700">
            {title}
          </h1>
        ) : (
          title
        )}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
