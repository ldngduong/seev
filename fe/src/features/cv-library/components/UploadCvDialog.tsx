import { Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/components/ui/button'
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

type UploadCvDialogProps = {
  open: boolean
  isUploading: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { file: File; name?: string }) => void
}

export function UploadCvDialog({
  open,
  isUploading,
  onOpenChange,
  onSubmit,
}: UploadCvDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          setFile(null)
          setName('')
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm CV mới</DialogTitle>
          <DialogDescription>
            Chọn tệp PDF để thêm vào thư viện CV của bạn.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!file || isUploading) {
              return
            }

            onSubmit({ file, name: name || undefined })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="cvName">Tên hiển thị</Label>
            <Input
              id="cvName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="CV Frontend tháng 7"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resume">PDF hồ sơ</Label>
            <Input
              id="resume"
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>


          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!file || isUploading}>
              <Upload className="size-4" />
              {isUploading ? 'Đang tải lên...' : 'Thêm CV'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
