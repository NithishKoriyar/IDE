import type { LanguageMode } from './types'

/**
 * Lets the Header's single Run button dispatch to whichever workspace is
 * active without importing JS/SQL execution internals directly. Each
 * workspace registers its `run()` on mount, keyed by language.
 */
type RunHandler = () => void

const registry = new Map<LanguageMode, RunHandler>()

export function registerRunHandler(lang: LanguageMode, handler: RunHandler): () => void {
  registry.set(lang, handler)
  return () => {
    if (registry.get(lang) === handler) {
      registry.delete(lang)
    }
  }
}

export function runActiveLanguage(lang: LanguageMode): void {
  registry.get(lang)?.()
}
