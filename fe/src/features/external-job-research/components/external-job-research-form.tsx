import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Link2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { listUserCvs, MAX_CV_PAGE_SIZE } from '@/entities/cv/api/cv-api'
import { useBilling } from '@/features/billing/hooks/use-billing'
import { Button } from '@/shared/components/ui/button'
import { Combobox } from '@/shared/components/ui/combobox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/lib/utils'
import { createJdResearch, createLinkResearch } from '../api/external-job-research-api'
import { toast } from 'sonner'

type Source = 'jd' | 'link'
type JdInput = 'text' | 'file'

export function ExternalJobResearchForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const billing = useBilling()
  const fileRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<Source>('jd')
  const [jdInput, setJdInput] = useState<JdInput>('text')
  const [cvId, setCvId] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const cvs = useQuery({ queryKey: ['user-cvs', { page: 1, status: 'ready', purpose: 'external-job-research' }], queryFn: () => listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE, status: 'ready' }) })
  const finish = (research: { id: string }) => { toast.success('Đã bắt đầu đánh giá nội dung tuyển dụng.'); void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] }); void navigate(`/research-history/external/${research.id}`) }
  const jdMutation = useMutation({ mutationFn: createJdResearch, onSuccess: finish })
  const linkMutation = useMutation({ mutationFn: createLinkResearch, onSuccess: finish })
  const pending = jdMutation.isPending || linkMutation.isPending
  const serviceCode = source === 'jd' ? 'external_jd_research' : 'external_link_research'
  const price = billing.products.find((product) => product.code === serviceCode)?.price_credits ?? null
  const enough = price === null || billing.balance === null || BigInt(billing.balance) >= BigInt(price)
  const valid = Boolean(cvId && (source === 'link' ? /^https?:\/\//i.test(url.trim()) : jdInput === 'file' ? file : text.trim().length >= 200))

  const submit = () => {
    if (!valid || pending) return
    if (source === 'link') linkMutation.mutate({ userCvId: cvId, url: url.trim() })
    else jdMutation.mutate({ userCvId: cvId, ...(jdInput === 'file' ? { file: file! } : { text: text.trim() }) })
  }

  return <div className="grid gap-5">
    <Tabs value={source} onValueChange={(value) => setSource(value as Source)}>
      <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl p-1">
        <TabsTrigger value="jd" className="h-full"><FileText />Cung cấp JD</TabsTrigger>
        <TabsTrigger value="link" className="h-full"><Link2 />Dán liên kết tuyển dụng</TabsTrigger>
      </TabsList>
    </Tabs>
    <div className="space-y-2"><Label>CV</Label><Combobox value={cvId} onChange={(value) => setCvId(String(value))} options={(cvs.data?.items ?? []).map((cv) => ({ value: cv.id, label: cv.name }))} placeholder={cvs.isLoading ? 'Đang tải CV...' : 'Chọn CV đã lưu'} searchPlaceholder="Tìm theo tên CV..." emptyMessage="Không tìm thấy CV" disabled={pending} /></div>
    {source === 'jd' ? <div className="grid gap-4 border-t pt-5">
      <div className="flex gap-2"><Button type="button" variant={jdInput === 'text' ? 'secondary' : 'ghost'} onClick={() => setJdInput('text')}>Dán nội dung</Button><Button type="button" variant={jdInput === 'file' ? 'secondary' : 'ghost'} onClick={() => setJdInput('file')}>Tải tệp</Button></div>
      {jdInput === 'text' ? <div className="space-y-2"><Label htmlFor="jdText">Nội dung JD</Label><Textarea id="jdText" value={text} onChange={(event) => setText(event.target.value)} className="min-h-56 resize-y" placeholder="Dán đầy đủ mô tả công việc và yêu cầu ứng viên..." disabled={pending} /><p className="text-xs text-muted-foreground">Tối thiểu 200 ký tự.</p></div> : <div className="space-y-2"><Label>Tệp JD</Label><input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button type="button" onClick={() => fileRef.current?.click()} className={cn('flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-5 text-center transition-colors hover:bg-muted/50', file && 'border-primary/50 bg-primary/5')}><Upload className="size-5 text-primary" /><span className="text-sm font-medium">{file?.name ?? 'Chọn tệp PDF, Word hoặc TXT'}</span><span className="text-xs text-muted-foreground">Tối đa 8 MB</span></button></div>}
    </div> : <div className="space-y-2 border-t pt-5"><Label htmlFor="recruitmentUrl">Liên kết tuyển dụng</Label><Input id="recruitmentUrl" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." disabled={pending} /><p className="text-xs leading-5 text-muted-foreground">Có thể dùng trang việc làm, bài Facebook hoặc bài viết có nội dung tuyển dụng.</p></div>}
    <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Hãy kiểm tra nội dung trước khi bắt đầu. Nếu JD hoặc liên kết không chứa đủ thông tin tuyển dụng, phiên đánh giá sẽ dừng và credit không được hoàn lại.</div>
    <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Chi phí: <strong className="text-foreground">{price ?? '—'} credits</strong>{billing.balance !== null ? ` · Số dư ${billing.balance} credits` : ''}</p><Button type="button" onClick={submit} disabled={!valid || !enough || pending}>{pending ? 'Đang bắt đầu...' : 'Bắt đầu đánh giá'}</Button></div>
  </div>
}
