import type { ReactNode } from 'react'

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded border border-border bg-surface-raised text-[11px] font-mono text-fg-faint">
      {children}
    </kbd>
  )
}
