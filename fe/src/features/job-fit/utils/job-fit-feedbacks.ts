import type { AuditFeedback } from '@/entities/cv/types/cv.types'
import type { JobFitEvidence } from '../types/job-fit.types'

/**
 * Converts requirement gaps into PDF annotations.
 * Met requirements are positive evidence, while unknown requirements have no
 * reliable CV text to annotate. Only partial and missing requirements belong
 * in the corrective highlight layer.
 */
export function buildJobFitGapFeedbacks(
  evidenceItems: JobFitEvidence[],
  idPrefix: string,
): AuditFeedback[] {
  return evidenceItems.flatMap((item, itemIndex) => {
    if (item.status !== 'partial' && item.status !== 'gap') return []

    return item.cv_evidence.map((evidence, evidenceIndex) => ({
      id: `${idPrefix}-${itemIndex}-${evidenceIndex}`,
      source_line_id: `${idPrefix}-${itemIndex}-${evidenceIndex}`,
      section: item.requirement,
      original_text: evidence,
      highlight_text: evidence,
      severity: 'warning' as const,
      issue: item.explanation,
      suggestion: '',
      highlight_color: 'red' as const,
    }))
  })
}
