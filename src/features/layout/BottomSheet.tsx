import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  headerRight?: ReactNode
}

/**
 * Generic draggable/swipe-to-close bottom sheet shared by both workspaces on
 * mobile. Drag is constrained to y=0 with downward-only elasticity; a fast or
 * far-enough downward drag calls `onClose` (whose unmount lets the parent's
 * `AnimatePresence` play the exit animation), otherwise Framer Motion springs
 * the sheet back to y=0 on release via the constraint.
 */
export function BottomSheet({ title, onClose, children, headerRight }: BottomSheetProps) {
  return (
    <>
      <motion.button
        type="button"
        aria-label="Close panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_event, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) onClose()
        }}
        className="fixed inset-x-0 bottom-0 z-50 flex h-[70dvh] flex-col rounded-t-2xl border-t border-outline-variant bg-surface-container shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative flex shrink-0 cursor-grab touch-none items-center justify-between border-b border-outline-variant px-4 py-2.5 active:cursor-grabbing">
          <div className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-outline-variant" />
          <span className="pt-1 text-sm font-medium text-on-surface">{title}</span>
          <div className="flex items-center gap-1 pt-1">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </motion.div>
    </>
  )
}
