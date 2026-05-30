import type { ReactNode } from 'react'
import { cx } from '@/lib/format'

type Tone = 'success' | 'warning' | 'info' | 'muted' | 'primary'

const tones: Record<Tone, string> = {
  success: 'bg-green/15 text-green',
  warning: 'bg-amber/15 text-amber',
  info: 'bg-info/15 text-info',
  muted: 'bg-surface-raised text-fg-faint',
  primary: 'bg-primary/15 text-primary-light',
}

export function Badge({ tone = 'muted', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium font-mono whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
