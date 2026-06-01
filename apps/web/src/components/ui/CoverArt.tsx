import { cx } from '@/lib/format'

const PALETTE = [
  ['#7C3AED', '#A78BFA'], ['#06B6D4', '#0EA5E9'], ['#F59E0B', '#EF4444'],
  ['#10B981', '#06B6D4'], ['#EC4899', '#7C3AED'], ['#3B82F6', '#7C3AED'],
  ['#F97316', '#EF4444'], ['#14B8A6', '#3B82F6'], ['#A855F7', '#EC4899'],
  ['#84CC16', '#10B981'], ['#FBBF24', '#F97316'], ['#6366F1', '#A855F7'],
]

function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h
}

export function coverGradient(id: string): string {
  const h = hashStr(id)
  const [a, b] = PALETTE[h % PALETTE.length]
  const angle = (h >> 4) % 360
  return `linear-gradient(${angle}deg, ${a}, ${b})`
}

interface Props {
  id: string
  /** Si está presente, se renderiza la imagen real (cover del archivo o de Spotify). */
  url?: string | null
  size?: number
  className?: string
}

export function CoverArt({ id, url, size = 80, className }: Props) {
  if (url) {
    return (
      <div
        className={cx('relative overflow-hidden bg-surface-raised', className)}
        style={{ width: size, height: size }}
      >
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
    )
  }
  // Fallback: gradiente determinístico por id
  return (
    <div
      className={cx('relative overflow-hidden', className)}
      style={{ width: size, height: size, background: coverGradient(id) }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.25), transparent 60%)',
        }}
      />
    </div>
  )
}
