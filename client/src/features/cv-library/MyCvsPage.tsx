import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { listUserCvs, uploadUserCv } from '@/services/cv-api'

export function MyCvsPage() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const cvsQuery = useQuery({
    queryKey: ['user-cvs'],
    queryFn: listUserCvs,
  })
  const uploadMutation = useMutation({
    mutationFn: uploadUserCv,
    onSuccess: () => {
      setFile(null)
      setName('')
      void queryClient.invalidateQueries({ queryKey: ['user-cvs'] })
    },
  })

  return (
    <main className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            CV library
          </Badge>
          <h1 className="text-3xl font-semibold tracking-normal">CV của tôi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload CV một lần, sau đó chọn CV này cho quick/custom research.
          </p>
        </div>
        <Link to="/research-cv" className={cn(buttonVariants())}>
          Start research
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Upload CV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cvName">Display name</Label>
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
            <Button
              type="button"
              className="w-full"
              disabled={!file || uploadMutation.isPending}
              onClick={() => {
                if (file) {
                  uploadMutation.mutate({ file, name: name || undefined })
                }
              }}
            >
              <Upload className="size-4" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload to R2'}
            </Button>
            {uploadMutation.isError ? (
              <p className="text-sm text-destructive">
                Upload failed. Check R2 configuration and PDF file.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <section className="grid gap-3">
          {cvsQuery.data?.map((cv) => (
            <Link
              key={cv.id}
              to={`/my-cvs/${cv.id}`}
              className="grid overflow-hidden rounded-md border bg-card transition-colors hover:bg-muted/40 md:grid-cols-[180px_minmax(0,1fr)]"
            >
              <div className="h-44 overflow-hidden bg-muted md:h-36">
                <object
                  data={`${cv.file_url}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                  type="application/pdf"
                  className="pointer-events-none h-full w-full"
                  aria-label={cv.name}
                >
                  <div className="grid h-full place-items-center">
                    <FileText className="size-8 text-muted-foreground" />
                  </div>
                </object>
              </div>
              <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="truncate font-semibold">{cv.name}</h2>
                    <Badge
                      variant={cv.status === 'ready' ? 'default' : 'secondary'}
                    >
                      {cv.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {cv.original_file_name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{cv.total_pages} pages</span>
                  <span>{Math.round(cv.size_bytes / 1024)} KB</span>
                </div>
              </div>
            </Link>
          ))}
          {cvsQuery.data?.length === 0 ? (
            <div className="grid min-h-[280px] place-items-center rounded-md border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No CV uploaded yet.
              </p>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  )
}
