import { useEffect, useState } from 'react'
import { useSettingsStore } from './settingsStore'
import { useLayoutStore } from './layoutStore'
import { useJsWorkspaceStore } from './jsWorkspaceStore'
import { useSqlWorkspaceStore } from './sqlWorkspaceStore'

/**
 * All persisted stores that must finish rehydrating from IndexedDB before the
 * app renders real content -- otherwise the UI flashes default/starter state
 * before snapping to the restored session.
 */
const hydratableStores = [
  useSettingsStore,
  useLayoutStore,
  useJsWorkspaceStore,
  useSqlWorkspaceStore,
] as const

function allHydrated(): boolean {
  return hydratableStores.every((store) => store.persist.hasHydrated())
}

export function useStoresHydrated(): boolean {
  const [hydrated, setHydrated] = useState(allHydrated)

  useEffect(() => {
    if (hydrated) return
    const unsubs = hydratableStores.map((store) =>
      store.persist.onFinishHydration(() => setHydrated(allHydrated())),
    )
    // Cover the case where hydration finished between the initial state calc
    // and this effect running.
    setHydrated(allHydrated())
    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }, [hydrated])

  return hydrated
}
