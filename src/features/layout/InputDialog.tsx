import { useState } from 'react'
import { motion } from 'motion/react'

interface InputDialogProps {
  title: string
  description?: string
  placeholder?: string
  initialValue?: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: (value: string) => void
}

export function InputDialog({
  title,
  description,
  placeholder,
  initialValue = '',
  confirmLabel,
  onCancel,
  onConfirm,
}: InputDialogProps) {
  const [value, setValue] = useState(initialValue)
  const trimmed = value.trim()

  const submit = () => {
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-high p-4 shadow-2xl"
      >
        <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
        {description && <p className="mt-1.5 text-xs text-on-surface-variant">{description}</p>}
        <input
          type="text"
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onCancel()
          }}
          className="mt-3 w-full rounded-md border border-outline-variant bg-surface-container px-3 py-1.5 text-sm text-on-surface outline-none focus:border-primary"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-highest"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!trimmed}
            className="rounded-md bg-primary-container px-3 py-1.5 text-xs font-medium text-on-primary-container hover:opacity-90 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
