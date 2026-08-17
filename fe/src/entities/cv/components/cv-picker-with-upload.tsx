import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { uploadUserCv } from '../api/cv-api'
import type { UserCv } from '../types/cv.types'
import { Button } from '@/shared/components/ui/button'
import { Combobox } from '@/shared/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

interface CvPickerWithUploadProps {
  id?: string
  value: string
  onChange: (cvId: string) => void
  cvs: UserCv[]
  isLoading?: boolean
  disabled?: boolean
  showPages?: boolean
  placeholder?: string
  loadingPlaceholder?: string
  emptyMessage?: string
}

export function CvPickerWithUpload({
  id,
  value,
  onChange,
  cvs,
  isLoading = false,
  disabled = false,
  showPages = false,
  placeholder = 'Tìm CV đã lưu',
  loadingPlaceholder = 'Đang tải CV...',
  emptyMessage = 'Không tìm thấy CV phù hợp',
}: CvPickerWithUploadProps) {
  const queryClient = useQueryClient()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')

  const uploadMutation = useMutation({
    mutationFn: uploadUserCv,
    onSuccess: (cv) => {
      toast.success('Đã thêm CV mới.')
      onChange(cv.id)
      setUploadOpen(false)
      setFile(null)
      setName('')
      void queryClient.invalidateQueries({ queryKey: ['user-cvs'] })
    },
    onError: () => {
      toast.error('Không thể tải CV lên. Vui lòng thử lại.')
    },
  })

  const options = cvs.map((cv) => ({
    value: cv.id,
    label: showPages ? `${cv.name} · ${cv.total_pages} trang` : cv.name,
  }))

  const closeUpload = () => {
    setUploadOpen(false)
    setFile(null)
    setName('')
  }

  const fileTooLarge = file !== null && file.size > MAX_FILE_SIZE_BYTES
  const canUpload = Boolean(file) && !fileTooLarge

  return (
    <div className="space-y-2">
      <Combobox
        id={id}
        value={value}
        onChange={(nextValue) => onChange(String(nextValue))}
        options={options}
        disabled={isLoading || disabled}
        placeholder={isLoading ? loadingPlaceholder : placeholder}
        searchPlaceholder="Tìm theo tên CV..."
        emptyMessage={emptyMessage}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-center gap-1.5 text-muted-foreground"
        onClick={() => setUploadOpen(true)}
        disabled={disabled || uploadMutation.isPending}
      >
        <Upload className="size-3.5" />
        {uploadMutation.isPending ? 'Đang tải lên...' : 'Tải CV mới lên'}
      </Button>

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => (open ? setUploadOpen(true) : closeUpload())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm CV mới</DialogTitle>
            <DialogDescription>
              Chọn tệp PDF (tối đa 5 MB) để dùng ngay trong research này.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!canUpload || uploadMutation.isPending) {
                return
              }
              uploadMutation.mutate({
                file: file!,
                name: name.trim() || undefined,
              })
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="newCvName">Tên hiển thị</Label>
              <Input
                id="newCvName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="CV Frontend tháng 7"
                disabled={uploadMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCvFile">PDF hồ sơ</Label>
              <Input
                id="newCvFile"
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={uploadMutation.isPending}
              />
              {fileTooLarge ? (
                <p className="text-xs text-destructive">
                  Tệp vượt quá 5 MB. Vui lòng chọn tệp nhỏ hơn.
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeUpload}
                disabled={uploadMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={!canUpload || uploadMutation.isPending}
              >
                <Upload className="size-4" />
                {uploadMutation.isPending ? 'Đang tải lên...' : 'Thêm CV'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}