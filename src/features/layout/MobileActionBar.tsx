import type { ReactNode } from 'react'
import clsx from 'clsx'

interface MobileActionBarProps {
  children: ReactNode
}

export function MobileActionBar({ children }: MobileActionBarProps) {
  return (
    <div
      className="flex h-14 shrink-0 items-center justify-center gap-3 border-t border-outline-variant bg-surface-container px-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {children}
    </div>
  )
}

interface MobileActionButtonProps {
  icon: ReactNode
  label: string
  onClick: () => void
  variant?: 'primary' | 'default'
}

export function MobileActionButton({ icon, label, onClick, variant = 'default' }: MobileActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold active:scale-95',
        variant === 'primary'
          ? 'bg-primary-container text-on-primary-container'
          : 'border border-outline-variant text-on-surface',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
