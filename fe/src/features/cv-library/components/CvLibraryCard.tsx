import { Link } from 'react-router'

import { CvPdfThumbnail } from '@/features/cv-library/components/CvPdfThumbnail'
import { useUserCvPdfFile } from '@/entities/cv/hooks/use-user-cv-pdf-file'
import { cn } from '@/shared/lib/utils'
import type { UserCv } from '@/entities/cv/types/cv.types'

type CvLibraryCardProps = {
  cv: UserCv
}

const STATUS_LABELS: Record<UserCv['status'], string> = {
  processing: 'Đang xử lý',
  ready: 'Sẵn sàng',
  failed: 'Thất bại',
}

const STATUS_CLASSES: Record<UserCv['status'], string> = {
  ready: 'bg-emerald-500/10 text-emerald-700',
  processing: 'bg-amber-500/10 text-amber-700',
  failed: 'bg-red-500/10 text-red-600',
}

export function CvLibraryCard({ cv }: CvLibraryCardProps) {
  const cvFileQuery = useUserCvPdfFile(cv.status === 'ready' ? cv.id : null)

  return (
    <Link
      to={`/my-cvs/${cv.id}`}
      className="group block min-w-0 rounded-2xl border border-border/60 bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
    >
      <CvPdfThumbnail
        file={cvFileQuery.data ?? null}
        isLoading={cvFileQuery.isLoading}
        name={cv.name}
      />
      <div className="mt-3 min-w-0 space-y-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h2 className="truncate font-semibold text-zinc-700">{cv.name}</h2>
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
              STATUS_CLASSES[cv.status],
            )}
          >
            {STATUS_LABELS[cv.status]}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {cv.original_file_name}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{cv.total_pages} trang</span>
          <span className="shrink-0">·</span>
          <span className="truncate">{Math.round(cv.size_bytes / 1024)} KB</span>
        </div>
      </div>
    </Link>
  )
}
