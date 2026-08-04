import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'

import { DataPagination } from '@/components/data/DataPagination'
import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CvLibraryCard } from '@/features/cv-library/components/CvLibraryCard'
import { UploadCvDialog } from '@/features/cv-library/components/UploadCvDialog'
import { cn } from '@/lib/utils'
import { listUserCvs, uploadUserCv } from '@/services/cv-api'

const PAGE_SIZE = 12

export function MyCvsPage() {
  const queryClient = useQueryClient()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { page, search: deferredSearch }],
    queryFn: () => listUserCvs({
      page,
      pageSize: PAGE_SIZE,
      search: deferredSearch || undefined,
    }),
    placeholderData: keepPreviousData,
  })
  const uploadMutation = useMutation({
    mutationFn: uploadUserCv,
    onSuccess: () => {
      setIsUploadDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['user-cvs'] })
    },
  })
  const cvs = cvsQuery.data?.items ?? []

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader
        title="My CVs"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
              <Plus />
              Add CV
            </Button>
            <Link to="/research/new" className={cn(buttonVariants())}>
              New research
            </Link>
          </>
        }
      />

      <section className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Search CVs"
              className="pl-9"
            />
          </label>
        </div>

        {cvsQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Could not load your CVs.
          </div>
        ) : null}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {cvs.map((cv) => <CvLibraryCard key={cv.id} cv={cv} />)}
          {!cvsQuery.isLoading && cvs.length === 0 ? (
            <div className="grid min-h-80 place-items-center rounded-xl border bg-card p-8 text-center">
              <div className="space-y-4">
                <FileText className="mx-auto size-9 text-muted-foreground" />
                <div>
                  <h2 className="font-semibold text-zinc-700">No CVs found</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a CV or adjust the current filters.
                  </p>
                </div>
                <Button type="button" onClick={() => setIsUploadDialogOpen(true)}>
                  <Plus />
                  Add CV
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {cvsQuery.data?.meta ? (
          <DataPagination
            page={cvsQuery.data.meta.page}
            totalPages={cvsQuery.data.meta.total_pages}
            total={cvsQuery.data.meta.total}
            onPageChange={setPage}
          />
        ) : null}
      </section>

      <UploadCvDialog
        open={isUploadDialogOpen}
        isUploading={uploadMutation.isPending}
        isError={uploadMutation.isError}
        onOpenChange={setIsUploadDialogOpen}
        onSubmit={(values) => uploadMutation.mutate(values)}
      />
    </main>
  )
}
