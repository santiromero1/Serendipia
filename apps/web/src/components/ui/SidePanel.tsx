import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function SidePanel({ open, onClose, title, children, footer }: Props) {
  if (!open) return null
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/40 animate-fade-in" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col border-l border-border bg-surface shadow-card animate-slide-in-right"
      >
        <header className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-fg-faint hover:text-fg cursor-pointer transition-colors rounded p-1"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="border-t border-border p-4 shrink-0">{footer}</footer>}
      </aside>
    </>,
    document.body,
  )
}
