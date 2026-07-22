import { cn } from '@/lib/utils'

const sections = [
  {
    label: 'Profile',
    lines: ['w-9/12', 'w-7/12'],
    tone: 'critical',
  },
  {
    label: 'Skills',
    lines: ['w-6/12', 'w-8/12'],
    tone: 'warning',
  },
  {
    label: 'Projects',
    lines: ['w-8/12', 'w-10/12', 'w-7/12'],
    tone: 'warning',
  },
]

const popovers = [
  'left-[6%] top-[28%]',
  'right-[3%] top-[46%]',
  'left-[14%] bottom-[13%]',
]

export const AnimatedCvPreview = () => {
  return (
    <div className="relative aspect-[0.78] w-full min-w-0 rounded-4xl bg-muted p-3 shadow-2xl shadow-foreground/10 sm:w-[28rem]">
      <div className="relative h-full overflow-hidden rounded-3xl bg-background p-6 shadow-inner">
        <div className="mx-auto mb-7 flex w-7/12 flex-col items-center gap-3">
          <div className="h-5 w-full rounded-full bg-foreground/85" />
          <div className="h-3 w-8/12 rounded-full bg-muted-foreground/35" />
          <div className="h-3 w-10/12 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="flex flex-col gap-7">
          {sections.map((section, sectionIndex) => (
            <div key={section.label} className="flex flex-col gap-3">
              <div
                className={cn(
                  'seev-preview-highlight h-4 rounded-full',
                  section.tone === 'critical'
                    ? 'bg-destructive/28'
                    : 'bg-primary/25',
                )}
                style={{ animationDelay: `${sectionIndex * 220}ms` }}
              >
                <div className="h-full w-4/12 rounded-full bg-foreground/75" />
              </div>
              <div className="flex flex-col gap-2.5">
                {section.lines.map((width, lineIndex) => (
                  <div
                    key={`${section.label}-${lineIndex}`}
                    className={cn(
                      'seev-preview-highlight h-3.5 rounded-full',
                      width,
                      section.tone === 'critical' && lineIndex === 0
                        ? 'bg-destructive/24'
                        : section.tone === 'warning' && lineIndex === 0
                          ? 'bg-primary/24'
                          : 'bg-muted-foreground/18',
                    )}
                    style={{
                      animationDelay: `${sectionIndex * 260 + lineIndex * 90}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {popovers.map((position, index) => (
          <div
            key={position}
            className={cn(
              'seev-preview-popover absolute w-32 rounded-2xl border bg-popover p-3 shadow-lg',
              position,
            )}
            style={{ animationDelay: `${index * 360 + 1100}ms` }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="size-3 rounded-sm bg-primary/45" />
              <div className="size-3 rounded-sm bg-destructive/45" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-full rounded-full bg-muted-foreground/25" />
              <div className="h-1.5 w-9/12 rounded-full bg-muted-foreground/20" />
              <div className="h-1.5 w-7/12 rounded-full bg-muted-foreground/15" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
