import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors ' +
  'cursor-pointer select-none active:scale-[0.97] transition-transform ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:brightness-110 shadow-[0_0_0_1px] shadow-primary/40',
  secondary: 'bg-surface-raised text-fg border border-border hover:border-border-strong',
  ghost: 'text-fg-soft hover:bg-surface-raised hover:text-fg',
  danger: 'bg-transparent text-error border border-error/30 hover:bg-error/10',
}

const sizes: Record<Size, string> = {
  sm: 'text-[13px] h-8 px-3',
  md: 'text-sm h-10 px-4',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: Props) {
  return (
    <button className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  )
}
