import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import { Badge } from '@/components/ui/badge'
import { useAuditStore } from '@/stores/audit-store'
import type { AuditFeedback } from '@/types/cv'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfAuditViewerProps {
  file: File | Blob | string | null
  feedbacks: AuditFeedback[]
  activeFeedback: AuditFeedback | null
  onHighlightStatsChange?: (stats: HighlightStats) => void
}

export interface HighlightStats {
  matchedCount: number
  totalCount: number
  unmatchedFeedbackIds: string[]
}

export function PdfAuditViewer({
  file,
  feedbacks,
  activeFeedback,
  onHighlightStatsChange,
}: PdfAuditViewerProps) {
  const [totalPages, setTotalPages] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [highlightRects, setHighlightRects] = useState<PdfHighlightRect[]>([])
  const [popoverAnchorElement, setPopoverAnchorElement] =
    useState<HTMLElement | null>(null)
  const [popoverPosition, setPopoverPosition] =
    useState<PdfFeedbackPopoverPosition | null>(null)
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
    const result = buildPdfHighlightRects(
      viewerRef.current,
      searchableFeedbacks,
    )
    setHighlightRects((currentRects) =>
      areHighlightRectsEqual(currentRects, result.rects)
        ? currentRects
        : result.rects,
    )

    onHighlightStatsChange?.({
      matchedCount: result.matchedFeedbackIds.size,
      totalCount: searchableFeedbacks.length,
      unmatchedFeedbackIds: searchableFeedbacks
        .map((item) => item.feedback.id)
        .filter((id) => !result.matchedFeedbackIds.has(id)),
    })
  }, [onHighlightStatsChange, searchableFeedbacks])

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
      <div className="grid flex-1 place-items-center bg-muted/30 p-6">
        <div className="w-full max-w-xl rounded-md border border-dashed bg-background p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Upload a CV PDF to render it here. After AI feedback returns, click
            a note to highlight matching text in yellow or red.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        ref={viewerRef}
        className="relative flex-1 overflow-auto bg-muted/30 p-4"
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
          loading={<p className="text-sm text-muted-foreground">Loading PDF...</p>}
          error={
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load PDF file{loadError ? `: ${loadError}` : '.'}
            </div>
          }
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {Array.from({ length: totalPages }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-md border bg-background shadow-sm"
                data-pdf-page-number={index + 1}
              >
                <div className="border-b px-3 py-2">
                  <Badge variant="outline">Page {index + 1}</Badge>
                </div>
                <div className="relative">
                  <Page
                    pageNumber={index + 1}
                    renderAnnotationLayer={false}
                    width={760}
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
            aria-label="Open feedback"
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
      aria-label="CV feedback"
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
              {feedback.severity}
            </Badge>
            <button
              type="button"
              aria-label="Close feedback"
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
            Suggested rewrite
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
  const sortedRects = [...rects].sort(
    (left, right) => left.top - right.top || left.left - right.left,
  )
  const mergedRects: Array<{
    left: number
    top: number
    width: number
    height: number
  }> = []

  sortedRects.forEach((rect) => {
    const previous = mergedRects.at(-1)

    if (
      previous &&
      Math.abs(previous.top - rect.top) <= 2 &&
      Math.abs(previous.height - rect.height) <= 2 &&
      rect.left <= previous.left + previous.width + 4
    ) {
      const right = Math.max(previous.left + previous.width, rect.left + rect.width)
      previous.left = Math.min(previous.left, rect.left)
      previous.top = Math.min(previous.top, rect.top)
      previous.width = right - previous.left
      previous.height = Math.max(previous.height, rect.height)
      return
    }

    mergedRects.push({ ...rect })
  })

  return mergedRects.map((rect) => ({
    left: Math.max(0, rect.left - 1),
    top: Math.max(0, rect.top - 1),
    width: rect.width + 2,
    height: rect.height + 2,
  }))
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

function createSearchProfile(text: string): SearchProfile {
  const plain = normalizeForSearch(text)

  return {
    plain,
    compact: plain.replace(/[^a-z0-9+#.]/g, ''),
  }
}

function compactCharacter(char: string) {
  const normalized = char
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return /^[a-z0-9+#.]$/.test(normalized) ? normalized : ''
}

function normalizeForSearch(text: string) {
  return text
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
