import { useState } from 'react'
import { Star } from 'lucide-react'
import { cx } from '@/lib/format'

interface Props {
  rating: number | null
  size?: number
  /** Si se pasa, las estrellas son interactivas. Click en la actual la limpia. */
  onRate?: (rating: number | null) => void
  className?: string
}

export function Stars({ rating, size = 16, onRate, className }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const interactive = !!onRate
  const shown = hover ?? rating ?? 0

  return (
    <div
      className={cx('inline-flex items-center gap-0.5', className)}
      onMouseLeave={() => setHover(null)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label="Valoración"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
            onMouseEnter={() => interactive && setHover(n)}
            onClick={() => onRate?.(rating === n ? null : n)}
            className={cx('leading-none', interactive && 'cursor-pointer transition-transform hover:scale-110')}
          >
            <Star
              size={size}
              className={cx('transition-colors', filled ? 'text-amber' : 'text-fg-faint')}
              fill={filled ? 'currentColor' : 'none'}
            />
          </button>
        )
      })}
    </div>
  )
}
