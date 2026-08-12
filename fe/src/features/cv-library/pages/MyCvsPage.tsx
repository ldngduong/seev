import { FileText, Plus, Search } from 'lucide-react'
import { Link } from 'react-router'

import { DataPagination } from '@/shared/components/data/DataPagination'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { CvLibraryCard } from '@/features/cv-library/components/CvLibraryCard'
import { UploadCvDialog } from '@/features/cv-library/components/UploadCvDialog'
import { useCvLibrary } from '@/features/cv-library/hooks/use-cv-library'
import { cn } from '@/shared/lib/utils'

export function MyCvsPage() {
  const library = useCvLibrary()

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader
        title="CV của tôi"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => library.setIsUploadDialogOpen(true)}>
              <Plus />
              Thêm CV
            </Button>
            <Link to="/research/new" className={cn(buttonVariants())}>
              Research mới
            </Link>
          </>
        }
      />

      <section className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={library.search}
              onChange={(event) => library.setSearch(event.target.value)}
              placeholder="Tìm kiếm CV"
              className="pl-9"
            />
          </label>
        </div>

        {library.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Không tải được danh sách CV.
          </div>
        ) : null}
        {library.isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-border/60 bg-card p-3">
                <div className="aspect-[210/297] w-full rounded-xl bg-muted" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {library.cvs.map((cv) => <CvLibraryCard key={cv.id} cv={cv} />)}
            {library.cvs.length === 0 ? (
              <div className="grid min-h-80 place-items-center rounded-xl border bg-card p-8 text-center">
                <div className="space-y-4">
                  <FileText className="mx-auto size-9 text-muted-foreground" />
                  <div>
                    <h2 className="font-semibold text-zinc-700">Không tìm thấy CV</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Thêm CV hoặc điều chỉnh bộ lọc hiện tại.
                    </p>
                  </div>
                  <Button type="button" onClick={() => library.setIsUploadDialogOpen(true)}>
                    <Plus />
                    Thêm CV
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {library.meta ? (
          <DataPagination
            page={library.meta.page}
            totalPages={library.meta.total_pages}
            total={library.meta.total}
            onPageChange={library.setPage}
          />
        ) : null}
      </section>

      <UploadCvDialog
        open={library.isUploadDialogOpen}
        isUploading={library.isUploading}
        isError={library.isUploadError}
        onOpenChange={library.setIsUploadDialogOpen}
        onSubmit={library.uploadCv}
      />
    </main>
  )
}
