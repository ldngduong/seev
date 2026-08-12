import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, MapPin } from 'lucide-react'

import { formatJobContent, formatJobType, isDisplayableSkill } from '@/features/job-research/utils/job-feed.utils'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import type { JobFitAnalysis } from '../types/job-fit.types'

const dimensionLabels = { role_category: 'Vai trò và chuyên môn', technical_skills: 'Kỹ năng kỹ thuật', experience_scope: 'Kinh nghiệm và phạm vi công việc', seniority: 'Cấp bậc', work_context: 'Địa điểm và hình thức làm việc' }
const verdictLabels: Record<string, string> = { very_good: 'Rất phù hợp', good: 'Phù hợp', consider: 'Nên cân nhắc', low: 'Ít phù hợp' }

export function JobFitResultPanel({ analysis }: { analysis: JobFitAnalysis }) {
  const result = analysis.result
  const skills = (analysis.job.skills ?? []).filter(isDisplayableSkill)
  const description = formatJobContent(analysis.job.description)
  const requirements = formatJobContent(analysis.job.requirements)

  return (
    <aside className="flex flex-col gap-6 pr-1">
      <article className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Việc làm đang đối chiếu</p>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-zinc-800">{analysis.job.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{analysis.job.company_name || 'Chưa cập nhật công ty'}</p>
          </div>
          <Button variant="outline" size="icon-sm" aria-label={analysis.job.is_expired ? 'Việc làm đã hết hạn' : 'Mở việc làm gốc'} disabled={analysis.job.is_expired} onClick={() => window.open(analysis.job.source_url, '_blank', 'noopener,noreferrer')}><ExternalLink /></Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {analysis.job.is_expired ? <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Đã hết hạn</Badge> : null}
          <Badge variant="secondary">{analysis.job.source}</Badge>
          {analysis.job.category_name ? <Badge variant="outline">{analysis.job.category_name}</Badge> : null}
          {analysis.job.seniority_levels?.map((level) => <Badge key={level} variant="outline">{level}</Badge>)}
        </div>
        {analysis.job.locations.length ? <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{analysis.job.locations.join(' · ')}</p> : null}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {analysis.job.salary_text ? <span>{analysis.job.salary_text}</span> : null}
          {analysis.job.experience ? <span>{analysis.job.experience}</span> : null}
          {analysis.job.job_type ? <span>{formatJobType(analysis.job.job_type)}</span> : null}
        </div>
        {skills.length ? <div className="mt-3 flex flex-wrap gap-1.5">{skills.map((skill) => <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs text-zinc-600">{skill}</span>)}</div> : null}

        {(description || requirements) ? (
          <details className="group mt-4 border-t border-border/60 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-primary">
              Xem mô tả và yêu cầu
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-5">
              <JobSection title="Mô tả công việc" content={description} />
              <JobSection title="Yêu cầu ứng viên" content={requirements} />
            </div>
          </details>
        ) : null}
      </article>

      {result ? <JobFitAssessment result={result} /> : null}
    </aside>
  )
}

export function JobFitAssessment({ result }: { result: NonNullable<JobFitAnalysis['result']> }) {
  return <>
    <section className="border-t border-border/60 pt-5"><div className="flex items-end justify-between"><div><p className="text-sm font-medium text-muted-foreground">Mức độ phù hợp</p><p className="mt-2 font-medium text-primary">{verdictLabels[result.verdict]}</p></div><div><strong className="text-4xl tracking-tight text-zinc-800">{result.score}</strong><span className="text-muted-foreground">/100</span></div></div><Progress value={result.score} className="mt-3" /><p className="mt-3 text-sm leading-6 text-muted-foreground">{result.summary}</p></section>
    <section className="border-t border-border/60 pt-5"><h3 className="text-sm font-semibold text-zinc-800">Chi tiết điểm</h3><div className="mt-4 space-y-4">{result.dimensions.map((item) => <div key={item.code}><div className="flex justify-between gap-3 text-sm"><p className="font-medium text-zinc-800">{dimensionLabels[item.code]}</p><span className="tabular-nums text-muted-foreground">{item.score}/{item.max_score}</span></div><Progress value={(item.score / item.max_score) * 100} className="mt-1.5 h-1.5" /><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.rationale}</p></div>)}</div></section>
    <section className="border-t border-border/60 pt-5"><h3 className="text-sm font-semibold text-zinc-800">Đối chiếu yêu cầu</h3><div className="mt-3 divide-y divide-border/60">{result.requirement_evidence.map((item, index) => <div key={`${item.requirement}-${index}`} className="py-3"><div className="flex gap-2">{item.status === 'met' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />}<div><p className="text-sm font-medium text-zinc-800">{item.requirement}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.explanation}</p>{item.cv_evidence.map((evidence) => <blockquote key={evidence} className="mt-2 border-l-2 border-primary/30 pl-3 text-xs italic text-zinc-600">“{evidence}”</blockquote>)}</div></div></div>)}</div></section>
    <TextList title="Điểm mạnh" items={result.strengths} />
    <TextList title="Khoảng trống cần lưu ý" items={result.gaps} />
    <TextList title="Nên làm trước khi ứng tuyển" items={result.actions} />
  </>
}

function JobSection({ title, content }: { title: string; content: string }) { if (!content) return null; return <section><h3 className="text-sm font-semibold text-zinc-800">{title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700">{content}</p></section> }
function TextList({ title, items }: { title: string; items: string[] }) { if (!items.length) return null; return <section className="border-t border-border/60 pt-5"><h3 className="text-sm font-semibold text-zinc-800">{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground"><span className="text-primary">•</span><span>{item}</span></li>)}</ul></section> }
