import { Gift } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import type { NewAccountCreditsSetting } from '../types/admin.types'

interface NewAccountCreditsCardProps {
  setting?: NewAccountCreditsSetting
  isSaving: boolean
  onSave: (setting: Pick<NewAccountCreditsSetting, 'enabled' | 'credits'>) => Promise<unknown>
}

export function NewAccountCreditsCard({
  setting,
  isSaving,
  onSave,
}: NewAccountCreditsCardProps) {
  const [enabled, setEnabled] = useState(false)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    if (!setting) return
    setEnabled(setting.enabled)
    setCredits(setting.credits)
  }, [setting])

  const hasChanges = Boolean(
    setting &&
      (enabled !== setting.enabled || credits !== setting.credits),
  )

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="size-4 text-primary" />
            <h2 className="font-semibold text-zinc-800">Credit tài khoản mới</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Áp dụng cho tài khoản được tạo sau khi lưu.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Bật credit cho tài khoản mới"
          onClick={() => setEnabled((current) => !current)}
          className={cn(
            'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
            enabled ? 'bg-primary' : 'bg-zinc-200',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      <div className="mt-6">
        <label htmlFor="new-account-credits" className="text-sm font-medium text-zinc-700">
          Số credit được tặng
        </label>
        <Input
          id="new-account-credits"
          type="number"
          min={0}
          max={1_000_000}
          step={1}
          value={credits}
          onChange={(event) => {
            const value = Number(event.target.value)
            setCredits(Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0)
          }}
          className="mt-2"
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className={cn('text-sm font-medium', enabled ? 'text-primary' : 'text-muted-foreground')}>
          {enabled ? `Đang tặng ${credits} credit` : 'Đang tắt'}
        </span>
        <Button
          size="sm"
          disabled={!setting || !hasChanges || isSaving}
          onClick={() => void onSave({ enabled, credits })}
        >
          {isSaving ? 'Đang lưu' : 'Lưu thay đổi'}
        </Button>
      </div>
    </article>
  )
}
