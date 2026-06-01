import { useEffect, useRef } from 'react'
import { cx } from '@/lib/format'

interface Props {
  peaks: number[]
  /** posición de reproducción 0..1 (cursor + relleno hasta acá) */
  progress?: number
  /** color de las barras del waveform */
  color?: string
  /** color de la parte ya reproducida */
  playedColor?: string
  height?: number
  onSeek?: (ratio: number) => void
  className?: string
}

/**
 * Canvas-rendered waveform. Liviano (sin wavesurfer). Click = seek.
 * Las barras se dibujan simétricas arriba/abajo del eje horizontal.
 */
export function Waveform({
  peaks,
  progress = 0,
  color = '#475569',
  playedColor = '#A78BFA',
  height = 56,
  onSeek,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = height
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    if (peaks.length === 0) return

    const mid = h / 2
    const barWidth = w / peaks.length
    const gap = barWidth > 2 ? 1 : 0
    const drawW = Math.max(1, barWidth - gap)
    const playedX = w * progress

    for (let i = 0; i < peaks.length; i++) {
      const px = i * barWidth
      const amp = peaks[i] * (h * 0.45)
      ctx.fillStyle = px < playedX ? playedColor : color
      ctx.fillRect(px, mid - amp, drawW, amp * 2)
    }
  }, [peaks, progress, color, playedColor, height])

  const handleClick = (e: React.MouseEvent) => {
    if (!onSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(Math.max(0, Math.min(1, ratio)))
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ height, width: '100%' }}
      className={cx('block', onSeek && 'cursor-pointer', className)}
      aria-label="Forma de onda del track"
    />
  )
}
