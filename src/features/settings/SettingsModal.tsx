import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { GeneralSection } from './sections/GeneralSection'
import { SuggestionsSection } from './sections/SuggestionsSection'
import { JavaScriptSection } from './sections/JavaScriptSection'
import { SqlSection } from './sections/SqlSection'

interface SettingsModalProps {
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-5 py-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">{title}</h3>
      {children}
    </section>
  )
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Capture phase: fires before any other handler (e.g. CodeMirror's own
    // keymap) has a chance to stopPropagation() on the bubbling phase.
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-high shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-5 py-3">
          <h2 className="text-sm font-semibold text-on-surface">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 divide-y divide-outline-variant overflow-y-auto">
          <Section title="General">
            <GeneralSection />
          </Section>
          <Section title="Suggestions">
            <SuggestionsSection />
          </Section>
          <Section title="JavaScript">
            <JavaScriptSection />
          </Section>
          <Section title="SQL">
            <SqlSection />
          </Section>
        </div>
      </motion.div>
    </motion.div>
  )
}
