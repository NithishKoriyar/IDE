import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage, hasLegacySqliteBytes, LEGACY_DEFAULT_DATABASE_ID } from './persistStorage'

export interface UserDatabaseMeta {
  id: string
  name: string
  createdAt: number
}

interface SqlDatabasesStore {
  userDatabases: UserDatabaseMeta[]
  /** Whether the one-time "was there already a database from before presets existed?" check has run. */
  legacyMigrationDone: boolean
  createUserDatabase: (name: string) => string
  renameUserDatabase: (id: string, name: string) => void
  deleteUserDatabase: (id: string) => void
  /** Registers the pre-preset single database (if any bytes exist for it) as an
   * ordinary user database exactly once, so upgrading to multi-database support
   * never strands or silently discards a user's earlier work. Safe to call on
   * every launch -- it's a no-op once `legacyMigrationDone` is true. */
  ensureLegacyMigration: () => Promise<void>
}

export const useSqlDatabasesStore = create<SqlDatabasesStore>()(
  persist(
    (set, get) => ({
      userDatabases: [],
      legacyMigrationDone: false,
      createUserDatabase: (name) => {
        const id = `user-${crypto.randomUUID()}`
        const database: UserDatabaseMeta = { id, name, createdAt: Date.now() }
        set((s) => ({ userDatabases: [...s.userDatabases, database] }))
        return id
      },
      renameUserDatabase: (id, name) =>
        set((s) => ({ userDatabases: s.userDatabases.map((d) => (d.id === id ? { ...d, name } : d)) })),
      deleteUserDatabase: (id) =>
        set((s) => ({ userDatabases: s.userDatabases.filter((d) => d.id !== id) })),
      ensureLegacyMigration: async () => {
        if (get().legacyMigrationDone) return
        const hasLegacyData = await hasLegacySqliteBytes()
        set((s) => ({
          legacyMigrationDone: true,
          userDatabases: hasLegacyData
            ? [...s.userDatabases, { id: LEGACY_DEFAULT_DATABASE_ID, name: 'My Database', createdAt: Date.now() }]
            : s.userDatabases,
        }))
      },
    }),
    {
      name: 'localide:sql-databases',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
)
