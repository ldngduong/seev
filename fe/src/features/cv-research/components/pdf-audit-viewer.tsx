import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import { Badge } from '@/shared/components/ui/badge'
import '@/features/cv-research/lib/pdfjs-worker'
import { useAuditStore } from '@/features/cv-research/store/audit-store'
import type { AuditFeedback, FeedbackSeverity } from '@/entities/cv/types/cv.types'

interface PdfAuditViewerProps {
  file: File | Blob | string | null
  feedbacks: AuditFeedback[]
  activeFeedback: AuditFeedback | null
  bare?: boolean
}

export function PdfAuditViewer({
  file,
  feedbacks,
  activeFeedback,
  bare = false,
}: PdfAuditViewerProps) {
  const [totalPages, setTotalPages] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [highlightRects, setHighlightRects] = useState<PdfHighlightRect[]>([])
  const [popoverAnchorElement, setPopoverAnchorElement] =
    useState<HTMLElement | null>(null)
  const [popoverPosition, setPopoverPosition] =
    useState<PdfFeedbackPopoverPosition | null>(null)
  const [pageWidth, setPageWidth] = useState<number | null>(null)
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const openFeedbackPopover = useAuditStore(
    (state) => state.openFeedbackPopover,
  )
  const closeFeedbackPopover = useAuditStore(
    (state) => state.closeFeedbackPopover,
  )

  const searchableFeedbacks = useMemo(
    () =>
      feedbacks
        .map((feedback) => ({
          feedback,
          searchProfile: createSearchProfile(
            feedback.highlight_text || feedback.original_text,
          ),
        }))
        .filter(({ searchProfile }) => searchProfile.compact.length >= 8),
    [feedbacks],
  )

  const updateHighlights = useCallback(() => {
    const { rects } = buildPdfHighlightRects(
      viewerRef.current,
      searchableFeedbacks,
    )
    setHighlightRects((currentRects) =>
      areHighlightRectsEqual(currentRects, rects)
        ? currentRects
        : rects,
    )
  }, [searchableFeedbacks])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) {
      return undefined
    }

    const measure = () => {
      const innerWidth = Math.min(
        840,
        Math.max(320, viewer.clientWidth - (bare ? 0 : 32)),
      )
      setPageWidth((current) => (current === innerWidth ? current : innerWidth))
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(viewer)

    return () => observer.disconnect()
  }, [bare])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateHighlights()
    }, 120)

    return () => window.clearTimeout(timer)
  }, [totalPages, updateHighlights])

  useEffect(() => {
    if (!activeFeedback) {
      setPopoverAnchorElement(null)
      setPopoverPosition(null)
    }
  }, [activeFeedback])

  const updatePopoverPosition = useCallback(() => {
    if (!popoverAnchorElement) {
      setPopoverPosition(null)
      return
    }

    setPopoverPosition(getPopoverPosition(popoverAnchorElement))
  }, [popoverAnchorElement])

  useEffect(() => {
    updatePopoverPosition()
  }, [updatePopoverPosition])

  useEffect(() => {
    if (!popoverAnchorElement) {
      return undefined
    }

    const viewer = viewerRef.current
    const handleLayoutChange = () => updatePopoverPosition()

    window.addEventListener('resize', handleLayoutChange)
    viewer?.addEventListener('scroll', handleLayoutChange, { passive: true })

    return () => {
      window.removeEventListener('resize', handleLayoutChange)
      viewer?.removeEventListener('scroll', handleLayoutChange)
    }
  }, [popoverAnchorElement, updatePopoverPosition])

  const openHighlightFeedback = useCallback(
    (feedbackId: string, anchorElement: HTMLElement) => {
      setPopoverPosition(getPopoverPosition(anchorElement))
      setPopoverAnchorElement(anchorElement)
      openFeedbackPopover(feedbackId)
    },
    [openFeedbackPopover],
  )

  const closeHighlightFeedback = useCallback(
    (feedbackId?: string) => {
      setPopoverAnchorElement(null)
      setPopoverPosition(null)
      closeFeedbackPopover(feedbackId)
    },
    [closeFeedbackPopover],
  )

  if (!file) {
    return (
      <div className="grid min-h-72 flex-1 place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Đang tải CV...</p>
      </div>
    )
  }

  return (
    <>
      <div
        ref={viewerRef}
        className={bare
          ? 'relative flex-1 bg-background'
          : 'relative flex-1 overflow-auto bg-muted/30 p-4'}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement

          if (target.closest<HTMLElement>('[data-feedback-id]')) {
            return
          }

          closeHighlightFeedback()
        }}
      >
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => {
            setLoadError(null)
            setTotalPages(numPages)
            setHighlightRects([])
          }}
          onLoadError={(error) => {
            setTotalPages(0)
            setHighlightRects([])
            setLoadError(error.message)
          }}
          loading={<p className="text-sm text-muted-foreground">Đang tải PDF...</p>}
          error={
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Không tải được file PDF{loadError ? `: ${loadError}` : '.'}
            </div>
          }
        >
          <div className={bare ? 'mx-auto flex w-full flex-col items-center gap-4' : 'mx-auto flex max-w-3xl flex-col gap-4'}>
            {Array.from({ length: totalPages }, (_, index) => (
              <div
                key={index}
                className={bare
                  ? 'overflow-hidden bg-background'
                  : 'overflow-hidden rounded-md border bg-background shadow-sm'}
                data-pdf-page-number={index + 1}
              >
                {!bare ? (
                  <div className="border-b px-3 py-2">
                    <Badge variant="outline">Trang {index + 1}</Badge>
                  </div>
                ) : null}
                <div className="relative">
                  <Page
                    pageNumber={index + 1}
                    renderAnnotationLayer={false}
                    width={pageWidth ?? 760}
                    onRenderTextLayerSuccess={() => {
                      window.setTimeout(() => {
                        updateHighlights()
                      }, 0)
                    }}
                  />
                  <PdfHighlightOverlay
                    highlights={highlightRects.filter(
                      (highlight) => highlight.pageNumber === index + 1,
                    )}
                    activeFeedbackId={activeFeedback?.id ?? null}
                    onOpenFeedback={openHighlightFeedback}
                  />
                </div>
              </div>
            ))}
          </div>
        </Document>
      </div>
      <PdfFeedbackPopover
        feedback={activeFeedback}
        onClose={() => closeHighlightFeedback(activeFeedback?.id)}
        position={popoverPosition}
      />
    </>
  )
}

interface PdfHighlightRect {
  id: string
  feedbackId: string
  pageNumber: number
  left: number
  top: number
  width: number
  height: number
  color: HighlightColor
}

interface PdfFeedbackPopoverPosition {
  left: number
  top: number
  width: number
}

type HighlightColor = AuditFeedback['highlight_color']

const SEVERITY_LABELS: Record<FeedbackSeverity, string> = {
  critical: 'Nghiêm trọng',
  warning: 'Cảnh báo',
  info: 'Thông tin',
}

function getPopoverPosition(anchorElement: HTMLElement): PdfFeedbackPopoverPosition {
  const anchorRect = anchorElement.getBoundingClientRect()
  const viewportGap = 12
  const popoverWidth = 320
  const availableRight = window.innerWidth - anchorRect.right - viewportGap
  const left =
    availableRight >= popoverWidth
      ? anchorRect.right + viewportGap
      : Math.max(viewportGap, anchorRect.left - popoverWidth - viewportGap)
  const top = Math.min(
    Math.max(viewportGap, anchorRect.top),
    Math.max(viewportGap, window.innerHeight - viewportGap - 420),
  )

  return { left, top, width: popoverWidth }
}

function PdfHighlightOverlay({
  highlights,
  activeFeedbackId,
  onOpenFeedback,
}: {
  highlights: PdfHighlightRect[]
  activeFeedbackId: string | null
  onOpenFeedback: (feedbackId: string, anchorElement: HTMLElement) => void
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {highlights.map((highlight) => {
        const isRed = highlight.color === 'red'

        return (
          <button
            key={highlight.id}
            type="button"
            data-feedback-id={highlight.feedbackId}
            aria-label="Mở phản hồi"
            className="absolute z-10 cursor-pointer select-none appearance-none rounded-[3px] border-0 p-0 outline-none focus-visible:ring-[2px] focus-visible:ring-ring/60"
            style={{
              left: highlight.left,
              top: highlight.top,
              width: highlight.width,
              height: highlight.height,
              backgroundColor: isRed
                ? 'rgb(252 165 165 / 0.54)'
                : 'rgb(253 224 71 / 0.58)',
              boxShadow: `0 0 0 ${
                activeFeedbackId === highlight.feedbackId ? 2 : 1
              }px ${
                isRed ? 'rgb(239 68 68 / 0.9)' : 'rgb(234 179 8 / 0.9)'
              }`,
              pointerEvents: 'auto',
            }}
            onPointerDownCapture={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onOpenFeedback(highlight.feedbackId, event.currentTarget)
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
          />
        )
      })}
    </div>
  )
}

function PdfFeedbackPopover({
  feedback,
  onClose,
  position,
}: {
  feedback: AuditFeedback | null
  onClose: () => void
  position: PdfFeedbackPopoverPosition | null
}) {
  if (!feedback || !position) {
    return null
  }

  return createPortal(
    <div
      data-feedback-popover=""
      role="dialog"
      aria-label="Phản hồi CV"
      className="fixed z-50 flex max-h-[min(420px,calc(100vh-2rem))] flex-col gap-2.5 overflow-auto rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <div className="flex flex-col gap-0.5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{feedback.section}</p>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={
                feedback.severity === 'critical' ? 'destructive' : 'secondary'
              }
            >
              {SEVERITY_LABELS[feedback.severity]}
            </Badge>
            <button
              type="button"
              aria-label="Đóng phản hồi"
              className="rounded-sm px-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              onClick={onClose}
            >
              x
            </button>
          </div>
        </div>
        <p className="text-muted-foreground">{feedback.issue}</p>
      </div>
      <div className="rounded-md bg-muted p-2 text-xs">
        {feedback.original_text}
      </div>
      {feedback.suggestion ? (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">
            Gợi ý viết lại
          </p>
          <p className="text-sm">{feedback.suggestion}</p>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

function buildPdfHighlightRects(
  root: HTMLDivElement | null,
  searchableFeedbacks: Array<{
    feedback: AuditFeedback
    searchProfile: SearchProfile
  }>,
) {
  if (!root) {
    return { rects: [], matchedFeedbackIds: new Set<string>() }
  }

  const pageWrappers = root.querySelectorAll<HTMLElement>(
    '[data-pdf-page-number]',
  )
  const matchedFeedbackIds = new Set<string>()
  const rects: PdfHighlightRect[] = []

  pageWrappers.forEach((pageWrapper) => {
    const pageNumber = Number(pageWrapper.dataset.pdfPageNumber)
    const pageElement =
      pageWrapper.querySelector<HTMLElement>('.react-pdf__Page')
    const textLayer = pageWrapper.querySelector<HTMLElement>(
      '.react-pdf__Page__textContent',
    )

    if (!pageNumber || !pageElement || !textLayer) {
      return
    }

    const textIndex = createTextLayerIndex(textLayer)
    const occupiedRanges: Array<{ start: number; end: number }> = []

    for (const item of searchableFeedbacks) {
      const ranges = findCompactRanges(textIndex.compact, item.searchProfile)

      for (const range of ranges) {
        if (rangesOverlapAny(range, occupiedRanges)) {
          continue
        }

        const rangeRects = createOverlayRectsFromRange(
          pageElement,
          textIndex.points,
          range,
        )

        if (rangeRects.length === 0) {
          continue
        }

        rangeRects.forEach((rect, rectIndex) => {
          rects.push({
            id: `${item.feedback.id}_${pageNumber}_${rectIndex}`,
            feedbackId: item.feedback.id,
            pageNumber,
            color: item.feedback.highlight_color,
            ...rect,
          })
        })
        occupiedRanges.push(range)
        matchedFeedbackIds.add(item.feedback.id)
        break
      }
    }
  })

  return { rects, matchedFeedbackIds }
}

interface SearchProfile {
  plain: string
  compact: string
}

interface CompactTextPoint {
  node: Text
  offset: number
}

function findCompactRanges(text: string, feedback: SearchProfile) {
  const ranges: Array<{ start: number; end: number }> = []

  if (feedback.compact.length < 6) {
    return ranges
  }

  let fromIndex = 0

  while (fromIndex < text.length) {
    const matchIndex = text.indexOf(feedback.compact, fromIndex)

    if (matchIndex === -1) {
      break
    }

    ranges.push({ start: matchIndex, end: matchIndex + feedback.compact.length })
    fromIndex = matchIndex + feedback.compact.length
  }

  return ranges
}

function createTextLayerIndex(textLayer: HTMLElement) {
  let compact = ''
  const points: CompactTextPoint[] = []
  const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const text = node.nodeValue ?? ''

    for (let offset = 0; offset < text.length; offset += 1) {
      const compactChar = compactCharacter(text[offset])

      if (!compactChar) {
        continue
      }

      compact += compactChar
      points.push({ node, offset })
    }
  }

  return { compact, points }
}

function createOverlayRectsFromRange(
  pageElement: HTMLElement,
  points: CompactTextPoint[],
  range: { start: number; end: number },
) {
  const startPoint = points[range.start]
  const endPoint = points[range.end - 1]

  if (!startPoint || !endPoint) {
    return []
  }

  const domRange = document.createRange()
  domRange.setStart(startPoint.node, startPoint.offset)
  domRange.setEnd(endPoint.node, endPoint.offset + 1)

  const pageRect = pageElement.getBoundingClientRect()
  const rects = mergeInlineRects(
    Array.from(domRange.getClientRects())
      .filter((rect) => rect.width > 1 && rect.height > 1)
      .map((rect) => ({
        left: rect.left - pageRect.left,
        top: rect.top - pageRect.top,
        width: rect.width,
        height: rect.height,
      })),
  )

  domRange.detach()

  return rects
}

function mergeInlineRects(
  rects: Array<{ left: number; top: number; width: number; height: number }>,
) {
  const lineGroups: Array<
    Array<{ left: number; top: number; width: number; height: number }>
  > = []
  const sortedRects = [...rects].sort(
    (left, right) => left.top - right.top || left.left - right.left,
  )

  sortedRects.forEach((rect) => {
    const line = lineGroups.find((candidate) =>
      candidate.some((lineRect) => areRectsOnSameLine(lineRect, rect)),
    )

    if (line) {
      line.push(rect)
      return
    }

    lineGroups.push([rect])
  })

  const mergedRects: Array<{
    left: number
    top: number
    width: number
    height: number
  }> = []

  lineGroups.forEach((line) => {
    line
      .sort((left, right) => left.left - right.left)
      .forEach((rect) => {
        const previous = mergedRects.at(-1)
        const lineGap = previous
          ? Math.max(
              6,
              Math.min(18, Math.max(previous.height, rect.height) * 0.75),
            )
          : 0

        if (
          previous &&
          areRectsOnSameLine(previous, rect) &&
          rect.left <= previous.left + previous.width + lineGap
        ) {
          const left = Math.min(previous.left, rect.left)
          const top = Math.min(previous.top, rect.top)
          const right = Math.max(
            previous.left + previous.width,
            rect.left + rect.width,
          )
          const bottom = Math.max(
            previous.top + previous.height,
            rect.top + rect.height,
          )

          previous.left = left
          previous.top = top
          previous.width = right - left
          previous.height = bottom - top
          return
        }

        mergedRects.push({ ...rect })
      })
  })

  mergedRects.sort(
    (left, right) => left.top - right.top || left.left - right.left,
  )

  return mergedRects.map((rect) => ({
    left: Math.max(0, rect.left - 1),
    top: Math.max(0, rect.top - 1),
    width: rect.width + 2,
    height: rect.height + 2,
  }))
}

function areRectsOnSameLine(
  left: { top: number; height: number },
  right: { top: number; height: number },
) {
  const overlap = Math.max(
    0,
    Math.min(left.top + left.height, right.top + right.height) -
      Math.max(left.top, right.top),
  )
  const minimumHeight = Math.min(left.height, right.height)

  return minimumHeight > 0 && overlap / minimumHeight >= 0.6
}

function rangesOverlapAny(
  range: { start: number; end: number },
  ranges: Array<{ start: number; end: number }>,
) {
  return ranges.some(
    (occupiedRange) =>
      range.start < occupiedRange.end && occupiedRange.start < range.end,
  )
}

function areHighlightRectsEqual(
  leftRects: PdfHighlightRect[],
  rightRects: PdfHighlightRect[],
) {
  if (leftRects.length !== rightRects.length) {
    return false
  }

  return leftRects.every((leftRect, index) => {
    const rightRect = rightRects[index]

    return (
      leftRect.id === rightRect.id &&
      leftRect.feedbackId === rightRect.feedbackId &&
      leftRect.pageNumber === rightRect.pageNumber &&
      leftRect.color === rightRect.color &&
      Math.abs(leftRect.left - rightRect.left) < 0.5 &&
      Math.abs(leftRect.top - rightRect.top) < 0.5 &&
      Math.abs(leftRect.width - rightRect.width) < 0.5 &&
      Math.abs(leftRect.height - rightRect.height) < 0.5
    )
  })
}

function createSearchProfile(text: unknown): SearchProfile {
  const plain = normalizeForSearch(text)

  return {
    plain,
    compact: plain.replace(/[^a-z0-9+#.]/g, ''),
  }
}

function compactCharacter(char: unknown) {
  const normalized = String(char ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return /^[a-z0-9+#.]$/.test(normalized) ? normalized : ''
}

function normalizeForSearch(text: unknown) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z])\s+([a-z])/gi, '$1 $2')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
