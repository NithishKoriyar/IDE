import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Play, Settings as SettingsIcon, Palette, Check } from 'lucide-react'
import clsx from 'clsx'
import { useSettingsStore } from '../../app/store/settingsStore'
import { useLayoutStore } from '../../app/store/layoutStore'
import { runActiveLanguage } from '../../app/runRegistry'
import { THEME_NAMES } from '../../app/types'
import type { ThemeName } from '../../app/types'

const THEME_LABELS: Record<ThemeName, string> = {
  light: 'Light',
  dark: 'Dark',
  dracula: 'Dracula',
  nord: 'Nord',
  monokai: 'Monokai',
  'github-dark': 'GitHub Dark',
  cyberpunk: 'Cyberpunk',
}

interface HeaderProps {
  isDesktop: boolean
  onOpenSettings: () => void
}

export function Header({ isDesktop, onOpenSettings }: HeaderProps) {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const activeLanguage = useLayoutStore((s) => s.activeLanguage)
  const setActiveLanguage = useLayoutStore((s) => s.setActiveLanguage)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)

  useEffect(() => {
    if (!isDesktop) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        runActiveLanguage(activeLanguage)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDesktop, activeLanguage])

  return (
    <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container px-4">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-2 text-base font-semibold tracking-wide text-primary">
          <img src="/icon.svg" alt="CYPH·IDE" className="h-6 w-6" />
          <span className="hidden sm:inline">CYPH<span className="text-secondary">·</span>IDE</span>
        </span>
        <nav className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1">
          {(['javascript', 'sql'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setActiveLanguage(lang)}
              className={clsx(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                activeLanguage === lang
                  ? 'bg-surface-container-highest text-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {lang === 'javascript' ? (
                <>
                  <span className="sm:hidden">JS</span>
                  <span className="hidden sm:inline">JavaScript</span>
                </>
              ) : (
                'SQL'
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setThemeMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Palette size={16} />
            <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
          </button>
          <AnimatePresence>
            {themeMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close theme menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setThemeMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high shadow-lg"
                >
                  {THEME_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setTheme(name)
                        setThemeMenuOpen(false)
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-highest"
                    >
                      {THEME_LABELS[name]}
                      {theme === name && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Buy Me a Coffee -- UI only for now, no link/action wired up yet. Commented out until ready to launch.
        <button
          type="button"
          aria-label="Buy me a coffee"
          className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <Coffee size={16} />
          <span className="hidden sm:inline">Buy me a coffee</span>
        </button>
        */}

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <SettingsIcon size={16} />
        </button>

        {isDesktop && (
          <button
            type="button"
            onClick={() => runActiveLanguage(activeLanguage)}
            className="flex items-center gap-2 rounded-lg bg-primary-container px-4 py-1.5 text-sm font-semibold text-on-primary-container transition-opacity hover:opacity-90 active:scale-95"
          >
            <Play size={16} fill="currentColor" />
            Run
          </button>
        )}
      </div>
    </header>
  )
}
