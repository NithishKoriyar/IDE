import { useSyncExternalStore } from 'react'

const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches
}

/**
 * JS-level (not CSS-only) desktop/mobile branch. Must be used to conditionally
 * *mount* the desktop vs. mobile layout tree -- CSS-only hiding would keep
 * both mounted at once (two live CodeMirror instances, duplicate SQL engine
 * access), which is a correctness bug, not just wasted rendering.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
