import type { ReactNode } from 'react'

interface SettingsRowProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-on-surface">{label}</p>
        {description && <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
