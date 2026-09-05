import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useStoresHydrated } from '../../app/store/hydration'
import { useSettingsStore } from '../../app/store/settingsStore'
import { useLayoutStore } from '../../app/store/layoutStore'
import { useSqlDatabasesStore } from '../../app/store/sqlDatabasesStore'
import { initStoragePersistence } from '../../app/store/persistStorage'
import { useIsDesktop } from './useIsDesktop'
import { Header } from './Header'
import { SettingsModal } from '../settings/SettingsModal'
import { WorkspaceErrorBoundary } from './WorkspaceErrorBoundary'

// Code-split per workspace: a first-time visitor only ever needs one
// language's CodeMirror setup (and, for SQL, the sql.js WASM glue) up front.
const JavaScriptWorkspace = lazy(() =>
  import('../../workspaces/JavaScriptWorkspace').then((m) => ({ default: m.JavaScriptWorkspace })),
)
const SqlWorkspace = lazy(() =>
  import('../../workspaces/SqlWorkspace').then((m) => ({ default: m.SqlWorkspace })),
)

function HydrationSplash() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-on-surface-variant">
      <span className="text-sm">Loading CYPH·IDE…</span>
    </div>
  )
}

function WorkspaceLoadingFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-on-surface-variant">
      <span className="text-sm">Loading workspace…</span>
    </div>
  )
}

export function AppShell() {
  const hydrated = useStoresHydrated()
  const theme = useSettingsStore((s) => s.theme)
  const activeLanguage = useLayoutStore((s) => s.activeLanguage)
  const isDesktop = useIsDesktop()
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    initStoragePersistence()
  }, [])

  // Runs once the sqlDatabasesStore has rehydrated (part of `hydrated`), so its
  // persisted `legacyMigrationDone` flag reflects reality before this checks it.
  useEffect(() => {
    if (!hydrated) return
    void useSqlDatabasesStore.getState().ensureLegacyMigration()
  }, [hydrated])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  if (!hydrated) {
    return <HydrationSplash />
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-on-background">
      <Header isDesktop={isDesktop} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <WorkspaceErrorBoundary key={activeLanguage}>
          <Suspense fallback={<WorkspaceLoadingFallback />}>
            {activeLanguage === 'javascript' ? <JavaScriptWorkspace /> : <SqlWorkspace />}
          </Suspense>
        </WorkspaceErrorBoundary>
      </main>

      <AnimatePresence>
        {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
