import { Bookmark } from 'lucide-react'

import { DataPagination } from '@/shared/components/data/DataPagination'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { JobFeedCard } from '@/features/job-research/components/job-feed-card'
import { JobFeedSkeleton } from '@/features/job-research/components/job-feed-skeleton'

import { useSavedJobs } from '../hooks/use-saved-jobs'

export function SavedJobsPage() {
  const { jobs, meta, isLoading, isError, page, setPage } = useSavedJobs()

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader title="Việc làm đã lưu" />

      {isLoading ? <JobFeedSkeleton /> : null}
      {!isLoading && !isError && jobs.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
          <div>
            <Bookmark className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium text-zinc-700">Chưa có việc làm đã lưu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bấm nút tim trên trang việc làm để lưu lại công việc quan tâm.
            </p>
          </div>
        </div>
      ) : null}
      {jobs.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobFeedCard key={job.id} job={job} />
          ))}
        </section>
      ) : null}
      {meta ? (
        <DataPagination
          page={page}
          totalPages={meta.total_pages}
          total={meta.total}
          onPageChange={setPage}
        />
      ) : null}
    </main>
  )
}