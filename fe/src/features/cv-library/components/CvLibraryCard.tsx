import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { CvPdfThumbnail } from '@/features/cv-library/components/CvPdfThumbnail'
import { useUserCvPdfFile } from '@/hooks/use-user-cv-pdf-file'
import type { UserCv } from '@/types/cv'

type CvLibraryCardProps = {
  cv: UserCv
}

export function CvLibraryCard({ cv }: CvLibraryCardProps) {
  const cvFileQuery = useUserCvPdfFile(cv.status === 'ready' ? cv.id : null)

  return (
    <Link
      to={`/my-cvs/${cv.id}`}
      className="group block min-w-0 rounded-2xl border bg-card p-3 transition-colors hover:bg-muted/40"
    >
      <CvPdfThumbnail
        file={cvFileQuery.data ?? null}
        isLoading={cvFileQuery.isLoading}
        name={cv.name}
      />
      <div className="mt-3 min-w-0 space-y-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h2 className="truncate font-semibold text-zinc-700">{cv.name}</h2>
          <Badge
            className="shrink-0"
            variant={cv.status === 'ready' ? 'default' : 'secondary'}
          >
            {cv.status}
          </Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {cv.original_file_name}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{cv.total_pages} pages</span>
          <span className="shrink-0">·</span>
          <span className="truncate">{Math.round(cv.size_bytes / 1024)} KB</span>
        </div>
      </div>
    </Link>
  )
}
