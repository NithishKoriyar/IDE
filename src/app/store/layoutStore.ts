import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from './persistStorage'
import type { LanguageMode, PanelSizes } from '../types'

interface LayoutStore {
  activeLanguage: LanguageMode
  activeJsPageId: string | null
  activeSqlPageId: string | null
  activeSqlDatabaseId: string | null
  panelSizes: PanelSizes
  isSqlExplorerCollapsed: boolean
  setActiveLanguage: (lang: LanguageMode) => void
  setActiveJsPageId: (id: string) => void
  setActiveSqlPageId: (id: string) => void
  setActiveSqlDatabaseId: (id: string) => void
  setPanelSizes: (sizes: Partial<PanelSizes>) => void
  toggleSqlExplorerCollapsed: () => void
}

/** All three are percentages (0..100) of their parent resizable Group. */
const defaultPanelSizes: PanelSizes = {
  jsEditorConsoleSplit: 70,
  sqlEditorResultsSplit: 70,
  sqlExplorerHeight: 30,
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      activeLanguage: 'javascript',
      activeJsPageId: null,
      activeSqlPageId: null,
      activeSqlDatabaseId: null,
      panelSizes: defaultPanelSizes,
      isSqlExplorerCollapsed: false,
      setActiveLanguage: (lang) => set({ activeLanguage: lang }),
      setActiveJsPageId: (id) => set({ activeJsPageId: id }),
      setActiveSqlPageId: (id) => set({ activeSqlPageId: id }),
      setActiveSqlDatabaseId: (id) => set({ activeSqlDatabaseId: id }),
      setPanelSizes: (sizes) => set((s) => ({ panelSizes: { ...s.panelSizes, ...sizes } })),
      toggleSqlExplorerCollapsed: () =>
        set((s) => ({ isSqlExplorerCollapsed: !s.isSqlExplorerCollapsed })),
    }),
    {
      name: 'localide:layout',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
)
