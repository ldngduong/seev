import type { ComponentProps } from 'react'

import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface AuthFieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
}

export function AuthField({ error, id, label, ...props }: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={Boolean(error)} {...props} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
