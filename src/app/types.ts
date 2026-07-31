export type ThemeName = 'light' | 'dark' | 'dracula' | 'nord' | 'monokai' | 'github-dark' | 'cyberpunk'

export const THEME_NAMES: ThemeName[] = [
  'light',
  'dark',
  'dracula',
  'nord',
  'monokai',
  'github-dark',
  'cyberpunk',
]

export type LanguageMode = 'javascript' | 'sql'

export type EditorFontFamily = 'mono' | 'sans'

export interface EditorSettings {
  fontSize: number
  fontFamily: EditorFontFamily
  wordWrap: boolean
  tabSize: number
  lineNumbers: boolean
}

export interface SuggestionSettings {
  autocomplete: boolean
  snippets: boolean
  parameterHints: boolean
}

export interface JavaScriptSettings {
  enableLinting: boolean
}

export interface SqlSettings {
  sqlSuggestions: boolean
}

export interface SettingsState {
  theme: ThemeName
  editor: EditorSettings
  suggestions: SuggestionSettings
  javascript: JavaScriptSettings
  sql: SqlSettings
}

/** All three are percentages (0..100) of their parent resizable Group. */
export interface PanelSizes {
  jsEditorConsoleSplit: number
  sqlEditorResultsSplit: number
  sqlExplorerHeight: number
}

export interface LayoutState {
  activeLanguage: LanguageMode
  activeJsPageId: string | null
  activeSqlPageId: string | null
  panelSizes: PanelSizes
  isSqlExplorerCollapsed: boolean
}

export interface JsRunSummary {
  hasError: boolean
  entryCount: number
  ranAt: number
}

export interface JsPage {
  id: string
  name: string
  code: string
  lastRun?: JsRunSummary
}

export interface SqlLastResult {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  execMs: number
  error: string | null
  ranAt: number
}

export interface SqlPage {
  id: string
  name: string
  query: string
  lastResult?: SqlLastResult
}

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error'

export interface ConsoleTextEntry {
  id: string
  kind: 'text'
  level: ConsoleLevel
  text: string
}

export interface ConsoleTableEntry {
  id: string
  kind: 'table'
  columns: string[]
  rows: Array<Record<string, string>>
}

export interface ConsoleClearEntry {
  id: string
  kind: 'clear'
}

export type ConsoleEntry = ConsoleTextEntry | ConsoleTableEntry | ConsoleClearEntry

/** Entries actually rendered in the output panel -- 'clear' entries are handled at insertion time and never stored. */
export type DisplayEntry = ConsoleTextEntry | ConsoleTableEntry
