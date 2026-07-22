import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage CVs, research sessions, and job suggestions from one
            workspace.
          </p>
        </div>
        <Link to="/my-cvs" className={cn(buttonVariants())}>
          CV của tôi
        </Link>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">CV library</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Upload and reuse saved CVs for quick or custom research.
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Research history</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Reopen completed sessions with the original audit snapshot.
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Job matching</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Review matched jobs collected from configured sources.
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
