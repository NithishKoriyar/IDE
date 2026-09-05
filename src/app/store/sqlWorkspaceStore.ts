import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from './persistStorage'
import { getNextPageName } from './nextPageName'
import type { SqlLastResult, SqlPage } from '../types'

interface SqlWorkspaceStore {
  pages: SqlPage[]
  createPage: () => string
  closePage: (id: string) => void
  updatePageQuery: (id: string, query: string) => void
  setPageLastResult: (id: string, result: SqlLastResult) => void
}

const seedPage: SqlPage = {
  id: 'sql-page-1',
  name: 'Page 1',
  query: '',
}

export const useSqlWorkspaceStore = create<SqlWorkspaceStore>()(
  persist(
    (set, get) => ({
      pages: [seedPage],
      createPage: () => {
        const name = getNextPageName(get().pages)
        const id = `sql-page-${crypto.randomUUID()}`
        const page: SqlPage = { id, name, query: '' }
        set((s) => ({ pages: [...s.pages, page] }))
        return id
      },
      closePage: (id) =>
        set((s) => (s.pages.length <= 1 ? s : { pages: s.pages.filter((p) => p.id !== id) })),
      updatePageQuery: (id, query) =>
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, query } : p)) })),
      setPageLastResult: (id, result) =>
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, lastResult: result } : p)) })),
    }),
    {
      name: 'localide:sql-workspace',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
)
