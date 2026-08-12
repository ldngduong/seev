import { FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'

import '@/features/cv-research/lib/pdfjs-worker'

type CvPdfThumbnailProps = {
  file: Blob | string | null
  isLoading?: boolean
  name: string
}

export function CvPdfThumbnail({
  file,
  isLoading = false,
  name,
}: CvPdfThumbnailProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [width, setWidth] = useState(0)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const element = wrapperRef.current

    if (!element) {
      return
    }

    const updateWidth = () => setWidth(element.clientWidth)
    const observer = new ResizeObserver(updateWidth)

    updateWidth()
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setHasError(false)

    if (!file) {
      setDocumentUrl(null)
      return
    }

    if (typeof file === 'string') {
      setDocumentUrl(file)
      return
    }

    const nextUrl = URL.createObjectURL(file)
    setDocumentUrl(nextUrl)

    return () => URL.revokeObjectURL(nextUrl)
  }, [file])

  return (
    <div
      ref={wrapperRef}
      className="relative aspect-[210/297] w-full overflow-hidden rounded-xl bg-muted/60"
    >
      {isLoading ? (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      ) : !documentUrl || hasError ? (
        <div className="absolute inset-0 grid place-items-center">
          <FileText className="size-9 text-muted-foreground" />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <Document
            file={documentUrl}
            loading={null}
            error={null}
            onLoadError={() => setHasError(true)}
          >
            {width > 0 ? (
              <Page
                pageNumber={1}
                width={width}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className="pointer-events-none"
                aria-label={name}
              />
            ) : null}
          </Document>
        </div>
      )}
    </div>
  )
}
