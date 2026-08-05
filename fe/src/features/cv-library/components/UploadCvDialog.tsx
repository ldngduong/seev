import { Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type UploadCvDialogProps = {
  open: boolean
  isUploading: boolean
  isError: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { file: File; name?: string }) => void
}

export function UploadCvDialog({
  open,
  isUploading,
  isError,
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
            Upload file PDF để lưu vào thư viện CV của bạn.
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
              placeholder="Frontend CV July"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resume">Resume PDF</Label>
            <Input
              id="resume"
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>

          {isError ? (
            <p className="text-sm text-destructive">
              Upload failed. Check R2 configuration and PDF file.
            </p>
          ) : null}

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
              {isUploading ? 'Uploading...' : 'Upload to R2'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
