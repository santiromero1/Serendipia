import { cx } from '@/lib/format'

interface Props {
  isResizing: boolean
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function SidebarResizeHandle({ isResizing, onPointerDown }: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionar panel de filtros"
      onPointerDown={onPointerDown}
      className={cx(
        'absolute right-0 top-0 z-20 h-full w-1.5 translate-x-1/2 cursor-col-resize touch-none',
        'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border before:transition-colors',
        'hover:before:bg-primary-light/70',
        isResizing && 'before:bg-primary-light',
      )}
    />
  )
}
