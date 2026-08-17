import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { listUserCvs } from '@/entities/cv/api/cv-api'
import { CvPickerWithUpload } from '@/entities/cv/components/cv-picker-with-upload'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { useBilling } from '@/features/billing/hooks/use-billing'
import { createJobFit } from '../api/job-fit-api'
import { toast } from 'sonner'

export function JobFitDialog({ jobId, jobTitle, open, onOpenChange }: { jobId: string; jobTitle: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null)
  const cvs = useQuery({ queryKey: ['user-cvs', 'job-fit-picker'], queryFn: () => listUserCvs({ page: 1, pageSize: 50 }) })
  const billing = useBilling()
  const product = billing.products.find((item) => item.code === 'job_fit_analysis')
  const mutation = useMutation({
    mutationFn: () => createJobFit(jobId, selectedCvId!),
    onSuccess: (analysis) => {
      toast.success('Đã bắt đầu đánh giá độ phù hợp.')
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
        <CvPickerWithUpload
          value={selectedCvId ?? ''}
          onChange={(cvId) => setSelectedCvId(cvId)}
          cvs={cvs.data?.items ?? []}
          isLoading={cvs.isLoading}
          disabled={mutation.isPending}
          showPages
          placeholder={
            cvs.isLoading
              ? 'Đang tải danh sách CV...'
              : cvs.data?.items.length
                ? 'Chọn CV của bạn'
                : 'Bạn chưa có CV sẵn sàng'
          }
        />
        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <span className="w-full text-xs text-muted-foreground">Chi phí: <strong className="text-foreground">{product?.price_credits ?? '—'} credits</strong> · Số dư {billing.balance ?? '—'}</span>
          <Button className="w-full" disabled={!selectedCvId || mutation.isPending || insufficient} onClick={() => mutation.mutate()}><Sparkles />{insufficient ? 'Không đủ credit' : mutation.isPending ? 'Đang tạo...' : 'Bắt đầu đánh giá'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
