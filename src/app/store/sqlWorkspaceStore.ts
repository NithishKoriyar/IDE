import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from './persistStorage'
import { SQL_STARTER_TEMPLATE } from '../../features/editor/sql/sqlStarterTemplate'
import type { SqlLastResult, SqlPage } from '../types'

interface SqlWorkspaceStore {
  pages: SqlPage[]
  nextPageNumber: number
  createPage: () => string
  updatePageQuery: (id: string, query: string) => void
  setPageLastResult: (id: string, result: SqlLastResult) => void
}

const seedPage: SqlPage = {
  id: 'sql-page-1',
  name: 'Page 1',
  query: SQL_STARTER_TEMPLATE,
}

export const useSqlWorkspaceStore = create<SqlWorkspaceStore>()(
  persist(
    (set, get) => ({
      pages: [seedPage],
      nextPageNumber: 2,
      createPage: () => {
        const { nextPageNumber } = get()
        const name = `Page ${nextPageNumber}`
        const id = `sql-page-${crypto.randomUUID()}`
        const page: SqlPage = { id, name, query: SQL_STARTER_TEMPLATE }
        set((s) => ({ pages: [...s.pages, page], nextPageNumber: s.nextPageNumber + 1 }))
        return id
      },
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
