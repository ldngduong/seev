import type { CSSProperties } from 'react'

import { cn } from '@/shared/lib/utils'

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
  {
    position: 'left-2 top-[25%] sm:-left-8',
    delay: '-4100ms',
    x: '-8px',
    y: '0px',
    width: 'w-24 sm:w-32',
  },
  {
    position: 'right-2 top-[36%] sm:-right-10',
    delay: '-2550ms',
    x: '8px',
    y: '0px',
    width: 'w-28 sm:w-36',
  },
  {
    position: 'left-2 top-[57%] sm:-left-7',
    delay: '-1200ms',
    x: '-10px',
    y: '2px',
    width: 'w-24 sm:w-32',
  },
  {
    position: 'right-2 bottom-[18%] sm:-right-6',
    delay: '-3600ms',
    x: '10px',
    y: '2px',
    width: 'w-24 sm:w-32',
  },
]

const popoverStyle = (popover: (typeof popovers)[number]) =>
  ({
    '--popover-delay': popover.delay,
    '--popover-x': popover.x,
    '--popover-y': popover.y,
  }) as CSSProperties

export const AnimatedCvPreview = () => {
  return (
    <div className="relative aspect-[0.78] w-full min-w-0 max-w-[24rem] overflow-hidden rounded-3xl bg-white p-2.5 shadow-lg sm:max-w-[28rem] sm:overflow-visible sm:rounded-4xl sm:p-3">
      <div className="relative h-full overflow-hidden rounded-2xl bg-background p-4 sm:rounded-3xl sm:p-6">
        <div className="mx-auto mb-5 flex w-7/12 flex-col items-center gap-2.5 sm:mb-7 sm:gap-3">
          <div className="h-5 w-full rounded-full bg-foreground/85" />
          <div className="h-3 w-8/12 rounded-full bg-muted-foreground/35" />
          <div className="h-3 w-10/12 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="flex flex-col gap-5 sm:gap-7">
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

      </div>

      {popovers.map((popover, index) => (
        <div
          key={`${popover.position}-${index}`}
          className={cn(
            'seev-preview-popover pointer-events-none absolute z-20 rounded-xl border bg-popover p-2 shadow-lg shadow-foreground/10 sm:rounded-2xl sm:p-3',
            popover.width,
            popover.position,
          )}
          style={popoverStyle(popover)}
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
  )
}
