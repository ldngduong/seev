import type { LucideIcon } from 'lucide-react'

export function ResearchModeButton({ icon: Icon, title, description, onClick }: {
  icon: LucideIcon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-44 items-start gap-4 p-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
      <span>
        <span className="block text-xl font-semibold text-zinc-700">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
