import { FileText, Search, ShieldCheck, Upload } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { AuditResultPanel } from '@/components/audit-result-panel'
import { CvUploadForm } from '@/components/cv-upload-form'
import {
  PdfAuditViewer,
  type HighlightStats,
} from '@/components/pdf-audit-viewer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuditStore } from '@/stores/audit-store'
import type { AuditSummary } from '@/types/cv'

const workflow = [
  {
    label: 'Upload CV',
    value: 'PDF <= 5MB',
    icon: Upload,
  },
  {
    label: 'Visual Audit',
    value: 'DeepSeek scoring',
    icon: FileText,
  },
  {
    label: 'Career Fit',
    value: 'Keyword + role ideas',
    icon: Search,
  },
]

function App() {
  const [audit, setAudit] = useState<AuditSummary | null>(null)
  const [highlightStats, setHighlightStats] = useState<HighlightStats | null>(
    null,
  )
  const selectedFeedbackId = useAuditStore((state) => state.selectedFeedbackId)
  const uploadedPdfFile = useAuditStore((state) => state.uploadedPdfFile)

  const activeFeedback = useMemo(
    () =>
      audit?.detailed_feedbacks.find(
        (feedback) => feedback.id === selectedFeedbackId,
      ) ?? null,
    [audit, selectedFeedbackId],
  )
  const handleAuditComplete = useCallback((nextAudit: AuditSummary) => {
    setHighlightStats(null)
    setAudit(nextAudit)
  }, [])
  const handleHighlightStatsChange = useCallback((stats: HighlightStats) => {
    setHighlightStats((current) => {
      if (
        current?.matchedCount === stats.matchedCount &&
        current.totalCount === stats.totalCount &&
        current.unmatchedFeedbackIds.join('|') ===
          stats.unmatchedFeedbackIds.join('|')
      ) {
        return current
      }

      return stats
    })
  }, [])

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">
              AI Resume Matcher
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                Smart CV auditor workspace
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Upload a PDF, let DeepSeek score the CV, highlight the exact
                feedback text, then review keyword and role suggestions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <ShieldCheck className="size-4 text-emerald-600" />
            React TS + NestJS
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {workflow.map((item) => (
            <Card key={item.label} className="rounded-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                <item.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid min-h-[680px] gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <div className="flex min-h-[620px] flex-col rounded-md border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">PDF viewer</h2>
                <p className="text-sm text-muted-foreground">
                  Click highlighted PDF text to view the detailed feedback.
                </p>
              </div>
              <Badge variant={selectedFeedbackId ? 'default' : 'outline'}>
                {highlightStats
                  ? `${highlightStats.matchedCount}/${highlightStats.totalCount} highlights`
                  : selectedFeedbackId ?? 'No feedback selected'}
              </Badge>
            </div>
            <PdfAuditViewer
              file={uploadedPdfFile}
              feedbacks={audit?.detailed_feedbacks ?? []}
              activeFeedback={activeFeedback}
              onHighlightStatsChange={handleHighlightStatsChange}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <CvUploadForm onAuditComplete={handleAuditComplete} />
            <AuditResultPanel audit={audit} />
          </aside>
        </section>
      </div>
    </main>
  )
}

export default App
