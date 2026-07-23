import { Link } from 'react-router'

import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  return (
    <main className="flex flex-col gap-4">
      <DashboardPageHeader
        title="Dashboard"
        actions={
          <Link to="/my-cvs" className={cn(buttonVariants())}>
            CV của tôi
          </Link>
        }
      />
      <section className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-2xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-zinc-700">
              CV library
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Upload and reuse saved CVs for quick or custom research.
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-zinc-700">
              Research history
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Reopen completed sessions with the original audit snapshot.
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-zinc-700">
              Job matching
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Review matched jobs collected from configured sources.
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
