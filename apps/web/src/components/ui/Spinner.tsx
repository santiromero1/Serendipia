import { cx } from '@/lib/format'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cx(
        'inline-block animate-spin rounded-full border-2 border-border border-t-primary',
        className ?? 'w-4 h-4',
      )}
    />
  )
}
