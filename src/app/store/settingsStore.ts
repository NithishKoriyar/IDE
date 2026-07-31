import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from './persistStorage'
import type { SettingsState, ThemeName } from '../types'

interface SettingsStore extends SettingsState {
  setTheme: (theme: ThemeName) => void
  updateEditorSetting: <K extends keyof SettingsState['editor']>(
    key: K,
    value: SettingsState['editor'][K],
  ) => void
  updateSuggestionSetting: <K extends keyof SettingsState['suggestions']>(
    key: K,
    value: SettingsState['suggestions'][K],
  ) => void
  updateJavaScriptSetting: <K extends keyof SettingsState['javascript']>(
    key: K,
    value: SettingsState['javascript'][K],
  ) => void
  updateSqlSetting: <K extends keyof SettingsState['sql']>(
    key: K,
    value: SettingsState['sql'][K],
  ) => void
}

const defaultSettings: SettingsState = {
  theme: 'cyberpunk',
  editor: {
    fontSize: 14,
    fontFamily: 'mono',
    wordWrap: true,
    tabSize: 2,
    lineNumbers: true,
  },
  suggestions: {
    autocomplete: true,
    snippets: true,
    parameterHints: true,
  },
  javascript: {
    enableLinting: true,
  },
  sql: {
    sqlSuggestions: true,
  },
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setTheme: (theme) => set({ theme }),
      updateEditorSetting: (key, value) =>
        set((s) => ({ editor: { ...s.editor, [key]: value } })),
      updateSuggestionSetting: (key, value) =>
        set((s) => ({ suggestions: { ...s.suggestions, [key]: value } })),
      updateJavaScriptSetting: (key, value) =>
        set((s) => ({ javascript: { ...s.javascript, [key]: value } })),
      updateSqlSetting: (key, value) => set((s) => ({ sql: { ...s.sql, [key]: value } })),
    }),
    {
      name: 'localide:settings',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
)
