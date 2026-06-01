import { useCallback, useState } from 'react'
import { MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, useUIStore } from '@/stores/ui'

export function useSidebarResize() {
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const [isResizing, setIsResizing] = useState(false)

  const onResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)

      const startX = e.clientX
      const startWidth = useUIStore.getState().sidebarWidth
      setIsResizing(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + ev.clientX - startX))
        setSidebarWidth(next)
      }

      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId)
        setIsResizing(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
        target.removeEventListener('pointercancel', onUp)
      }

      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
      target.addEventListener('pointercancel', onUp)
    },
    [setSidebarWidth],
  )

  return { isResizing, onResizeStart }
}
