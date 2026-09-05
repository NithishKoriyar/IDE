import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from './persistStorage'
import { getNextPageName } from './nextPageName'
import { getJsStarterTemplate } from '../../features/editor/javascript/jsStarterTemplate'
import type { JsPage, JsRunSummary } from '../types'

interface JsWorkspaceStore {
  pages: JsPage[]
  createPage: () => string
  closePage: (id: string) => void
  updatePageCode: (id: string, code: string) => void
  setPageLastRun: (id: string, summary: JsRunSummary) => void
}

const seedPage: JsPage = {
  id: 'js-page-1',
  name: 'Page 1',
  code: getJsStarterTemplate('Page 1'),
}

export const useJsWorkspaceStore = create<JsWorkspaceStore>()(
  persist(
    (set, get) => ({
      pages: [seedPage],
      createPage: () => {
        const name = getNextPageName(get().pages)
        const id = `js-page-${crypto.randomUUID()}`
        const page: JsPage = { id, name, code: getJsStarterTemplate(name) }
        set((s) => ({ pages: [...s.pages, page] }))
        return id
      },
      closePage: (id) =>
        set((s) => (s.pages.length <= 1 ? s : { pages: s.pages.filter((p) => p.id !== id) })),
      updatePageCode: (id, code) =>
        set((s) => ({
          pages: s.pages.map((p) => (p.id === id ? { ...p, code } : p)),
        })),
      setPageLastRun: (id, summary) =>
        set((s) => ({
          pages: s.pages.map((p) => (p.id === id ? { ...p, lastRun: summary } : p)),
        })),
    }),
    {
      name: 'localide:js-workspace',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
)
