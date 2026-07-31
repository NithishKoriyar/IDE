import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from './persistStorage'
import { getJsStarterTemplate } from '../../features/editor/javascript/jsStarterTemplate'
import type { JsPage, JsRunSummary } from '../types'

interface JsWorkspaceStore {
  pages: JsPage[]
  nextPageNumber: number
  createPage: () => string
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
      nextPageNumber: 2,
      createPage: () => {
        const { nextPageNumber } = get()
        const name = `Page ${nextPageNumber}`
        const id = `js-page-${crypto.randomUUID()}`
        const page: JsPage = { id, name, code: getJsStarterTemplate(name) }
        set((s) => ({ pages: [...s.pages, page], nextPageNumber: s.nextPageNumber + 1 }))
        return id
      },
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
