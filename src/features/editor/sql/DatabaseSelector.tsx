import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Database, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { SQL_PRESETS } from './presets'
import type { UserDatabaseMeta } from '../../../app/store/sqlDatabasesStore'

interface DatabaseSelectorProps {
  activeDatabaseId: string
  userDatabases: UserDatabaseMeta[]
  onSelect: (id: string) => void
  onCreateNew: () => void
  onDeleteUserDatabase: (id: string) => void
}

export function DatabaseSelector({
  activeDatabaseId,
  userDatabases,
  onSelect,
  onCreateNew,
  onDeleteUserDatabase,
}: DatabaseSelectorProps) {
  const [open, setOpen] = useState(false)

  // The trigger shows the short label for a preset ("Ecommerce") but a user
  // database's full name -- the open menu always shows full names either way.
  const activeName =
    SQL_PRESETS.find((p) => p.id === activeDatabaseId)?.shortName ??
    userDatabases.find((d) => d.id === activeDatabaseId)?.name ??
    'Select database'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-outline-variant px-2 py-1 text-xs font-medium text-on-surface hover:bg-surface-container-high"
      >
        <Database size={13} className="shrink-0 text-on-surface-variant" />
        <span className="max-w-53.75 truncate sm:max-w-77.75">{activeName}</span>
        <ChevronDown size={12} className="shrink-0 text-on-surface-variant" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Close database menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.12 }}
              // Mobile: anchored to the trigger's left edge (grows rightward).
              // Desktop (lg: matches useIsDesktop's 1024px breakpoint): anchored
              // to the trigger's right edge (grows leftward) -- the trigger sits
              // near the toolbar's right edge there, so this is what keeps the
              // panel on-screen instead of running off it.
              className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high shadow-lg lg:left-auto lg:right-0"
            >
              <div className="max-h-80 overflow-y-auto py-1">
                <p className="px-3 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-on-surface-variant uppercase">
                  Preset Databases
                </p>
                {SQL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelect(preset.id)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-highest"
                  >
                    <span className="flex-1 whitespace-normal">{preset.name}</span>
                    {activeDatabaseId === preset.id && <Check size={14} className="shrink-0 text-primary" />}
                  </button>
                ))}

                <p className="mt-1 border-t border-outline-variant px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-on-surface-variant uppercase">
                  My Databases
                </p>
                {userDatabases.length === 0 && (
                  <p className="px-3 py-2 text-xs text-on-surface-variant">No databases yet.</p>
                )}
                {userDatabases.map((database) => (
                  <div
                    key={database.id}
                    className={clsx(
                      'group flex w-full items-center justify-between px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-highest',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(database.id)
                        setOpen(false)
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="flex-1 whitespace-normal">{database.name}</span>
                      {activeDatabaseId === database.id && <Check size={14} className="shrink-0 text-primary" />}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${database.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteUserDatabase(database.id)
                      }}
                      className="shrink-0 rounded p-1 text-on-surface-variant opacity-0 hover:text-error group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onCreateNew()
                }}
                className="flex w-full items-center gap-1.5 border-t border-outline-variant px-3 py-2 text-left text-sm font-medium text-primary hover:bg-surface-container-highest"
              >
                <Plus size={14} />
                New Database
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
