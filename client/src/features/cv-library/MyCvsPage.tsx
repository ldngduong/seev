import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { CvLibraryCard } from '@/features/cv-library/components/CvLibraryCard'
import { UploadCvDialog } from '@/features/cv-library/components/UploadCvDialog'
import { cn } from '@/lib/utils'
import { listUserCvs, uploadUserCv } from '@/services/cv-api'

export function MyCvsPage() {
  const queryClient = useQueryClient()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const cvsQuery = useQuery({
    queryKey: ['user-cvs'],
    queryFn: listUserCvs,
  })
  const uploadMutation = useMutation({
    mutationFn: uploadUserCv,
    onSuccess: () => {
      setIsUploadDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['user-cvs'] })
    },
  })

  return (
    <main className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title="CV của tôi"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Plus className="size-4" />
              Thêm CV mới
            </Button>
            <Link to="/research-cv" className={cn(buttonVariants())}>
              Start research
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {cvsQuery.data?.map((cv) => <CvLibraryCard key={cv.id} cv={cv} />)}
        {cvsQuery.data?.length === 0 ? (
          <div className="grid min-h-[320px] place-items-center rounded-2xl border bg-card p-8 text-center">
            <div className="space-y-4">
              <FileText className="mx-auto size-9 text-muted-foreground" />
              <div>
                <h2 className="font-semibold text-zinc-700">
                  Chưa có CV nào
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thêm CV mới để bắt đầu research.
                </p>
              </div>
              <Button type="button" onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="size-4" />
                Thêm CV mới
              </Button>
            </div>
          </div>
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
