import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { listUserCvs } from '@/entities/cv/api/cv-api'
import { Button } from '@/shared/components/ui/button'
import { Combobox } from '@/shared/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { useBilling } from '@/features/billing/hooks/use-billing'
import { createJobFit } from '../api/job-fit-api'

export function JobFitDialog({ jobId, jobTitle, open, onOpenChange }: { jobId: string; jobTitle: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null)
  const cvs = useQuery({ queryKey: ['user-cvs', 'job-fit-picker'], queryFn: () => listUserCvs({ page: 1, pageSize: 50 }) })
  const billing = useBilling()
  const product = billing.products.find((item) => item.code === 'job_fit_analysis')
  const cvOptions = (cvs.data?.items ?? []).map((cv) => ({
    value: cv.id,
    label: `${cv.name} · ${cv.total_pages} trang`,
  }))
  const mutation = useMutation({
    mutationFn: () => createJobFit(jobId, selectedCvId!),
    onSuccess: (analysis) => {
      void queryClient.invalidateQueries({ queryKey: ['billing'] })
      onOpenChange(false)
      void navigate(`/jobs/${jobId}/fit/${analysis.id}`)
    },
  })
  const insufficient = product && billing.balance !== null ? BigInt(billing.balance) < BigInt(product.price_credits) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Kiểm tra độ phù hợp</DialogTitle>
          <DialogDescription>Chọn CV để đối chiếu trực tiếp với yêu cầu của “{jobTitle}”.</DialogDescription>
        </DialogHeader>
        <Combobox
          value={selectedCvId ?? undefined}
          onChange={(value) => setSelectedCvId(String(value))}
          options={cvOptions}
          disabled={cvs.isLoading || cvOptions.length === 0}
          placeholder={cvs.isLoading ? 'Đang tải danh sách CV...' : cvOptions.length ? 'Chọn CV của bạn' : 'Bạn chưa có CV sẵn sàng'}
          searchPlaceholder="Tìm theo tên CV..."
          emptyMessage="Không tìm thấy CV"
          className="w-full"
          triggerClassName="h-11 w-full"
          contentClassName="w-(--radix-popper-anchor-width)"
        />
        {mutation.isError ? <p className="text-sm text-destructive">{mutation.error instanceof Error ? mutation.error.message : 'Không thể tạo đánh giá.'}</p> : null}
        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <span className="w-full text-xs text-muted-foreground">Chi phí: <strong className="text-foreground">{product?.price_credits ?? '—'} credits</strong> · Số dư {billing.balance ?? '—'}</span>
          <Button className="w-full" disabled={!selectedCvId || mutation.isPending || insufficient} onClick={() => mutation.mutate()}><Sparkles />{insufficient ? 'Không đủ credit' : mutation.isPending ? 'Đang tạo...' : 'Bắt đầu đánh giá'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
