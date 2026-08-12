import { BriefcaseBusiness, Search } from 'lucide-react'

import { DataPagination } from '@/shared/components/data/DataPagination'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { Combobox } from '@/shared/components/ui/combobox'
import { Input } from '@/shared/components/ui/input'
import { JobCategoryPicker } from '@/entities/career-taxonomy/components/job-category-picker'

import { JobFeedCard } from '../components/job-feed-card'
import { JobFeedSkeleton } from '../components/job-feed-skeleton'
import { useJobFeed } from '../hooks/use-job-feed'

export function JobFeedPage({ publicMode = false }: { publicMode?: boolean }) {
  const { filters, actions, jobs, meta, isLoading, isError } = useJobFeed()

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader title={publicMode ? 'Việc làm CNTT' : 'Việc làm'} />

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => actions.setSearch(event.target.value)}
            placeholder="Tìm theo tên vị trí hoặc công ty"
            className="pl-9"
          />
        </label>
        <JobCategoryPicker
          value={filters.categoryId === 'all' ? null : filters.categoryId}
          showLabel={false}
          allowClear
          placeholder="Tất cả chuyên môn"
          onChange={(ids) => actions.setCategoryId(ids[0] ?? 'all')}
          className="lg:w-80"
        />
        <Combobox
          value={filters.seniorityLevelId}
          onChange={(value) => actions.setSeniorityLevelId(String(value))}
          options={filters.seniorityOptions}
          placeholder="Chọn cấp bậc"
          searchPlaceholder="Tìm cấp bậc..."
          emptyMessage="Không tìm thấy cấp bậc"
          className="lg:w-60"
        />
      </section>

      {isLoading ? <JobFeedSkeleton /> : null}
      {!isLoading && !isError && jobs.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
          <div>
            <BriefcaseBusiness className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium text-zinc-700">Chưa có việc làm phù hợp</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.
            </p>
          </div>
        </div>
      ) : null}
      {jobs.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobFeedCard key={job.id} job={job} publicMode={publicMode} />
          ))}
        </section>
      ) : null}
      {meta ? (
        <DataPagination
          page={meta.page}
          totalPages={meta.total_pages}
          total={meta.total}
          onPageChange={actions.setPage}
        />
      ) : null}
    </main>
  )
}
