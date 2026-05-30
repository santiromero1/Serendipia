import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cx } from '@/lib/format'

const fieldBase =
  'w-full rounded-lg bg-surface-raised border border-border px-3 text-sm text-fg ' +
  'placeholder:text-fg-faint transition-colors ' +
  'focus:border-primary focus:outline-none focus:shadow-[0_0_0_3px] focus:shadow-primary/15'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className, ...rest }: InputProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">
          {label}
        </label>
      )}
      <input id={fieldId} className={cx(fieldBase, 'h-10', className)} {...rest} />
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, id, className, ...rest }: TextareaProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">
          {label}
        </label>
      )}
      <textarea id={fieldId} className={cx(fieldBase, 'py-2 min-h-20 resize-y', className)} {...rest} />
    </div>
  )
}
