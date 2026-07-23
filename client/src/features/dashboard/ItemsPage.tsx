import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'

export function ItemsPage() {
  return (
    <main className="flex flex-col gap-4">
      <DashboardPageHeader title="Items" />
      <section className="grid min-h-[320px] place-items-center rounded-2xl border bg-card text-sm text-muted-foreground shadow-none">
        Empty page
      </section>
    </main>
  )
}
