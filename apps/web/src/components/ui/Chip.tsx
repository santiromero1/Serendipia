import type { ReactNode } from 'react'
import { cx } from '@/lib/format'

type ChipTone = 'moment' | 'genre' | 'custom'

interface Props {
  children: ReactNode
  tone?: ChipTone
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  title?: string
}

const toneStyles: Record<ChipTone, string> = {
  moment: 'bg-primary/15 text-primary-light border-primary/30',
  genre: 'bg-surface-raised text-fg-soft border-border',
  custom: 'bg-cyan/15 text-cyan border-cyan/30',
}

export function Chip({ children, tone = 'moment', active, onClick, onRemove, title }: Props) {
  const interactive = !!onClick
  return (
    <span
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title}
      onClick={onClick}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick?.()) : undefined}
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
        toneStyles[tone],
        interactive && 'cursor-pointer active:scale-[0.95] transition-transform',
        active && 'ring-1 ring-primary bg-primary/25 text-white border-primary',
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Quitar"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 -mr-0.5 rounded-full hover:text-white cursor-pointer leading-none"
        >
          ×
        </button>
      )}
    </span>
  )
}
