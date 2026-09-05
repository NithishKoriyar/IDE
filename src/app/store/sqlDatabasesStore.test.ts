import { beforeEach, describe, expect, it, vi } from 'vitest'

const fakeIdb = new Map<string, unknown>()
let legacyBytesPresent = false

vi.mock('./persistStorage', () => ({
  idbStorage: {
    getItem: async (name: string) => fakeIdb.get(name) ?? null,
    setItem: async (name: string, value: unknown) => {
      fakeIdb.set(name, value)
    },
    removeItem: async (name: string) => {
      fakeIdb.delete(name)
    },
  },
  hasLegacySqliteBytes: async () => legacyBytesPresent,
  LEGACY_DEFAULT_DATABASE_ID: 'user-legacy-default',
}))

const { useSqlDatabasesStore } = await import('./sqlDatabasesStore')

beforeEach(() => {
  fakeIdb.clear()
  legacyBytesPresent = false
  useSqlDatabasesStore.setState({ userDatabases: [], legacyMigrationDone: false })
})

describe('sqlDatabasesStore', () => {
  it('creates, renames, and deletes a user database', () => {
    const id = useSqlDatabasesStore.getState().createUserDatabase('Scratchpad')
    expect(useSqlDatabasesStore.getState().userDatabases).toHaveLength(1)
    expect(useSqlDatabasesStore.getState().userDatabases[0]).toMatchObject({ id, name: 'Scratchpad' })

    useSqlDatabasesStore.getState().renameUserDatabase(id, 'Renamed')
    expect(useSqlDatabasesStore.getState().userDatabases[0].name).toBe('Renamed')

    useSqlDatabasesStore.getState().deleteUserDatabase(id)
    expect(useSqlDatabasesStore.getState().userDatabases).toHaveLength(0)
  })

  it('registers the legacy single database exactly once, only if bytes existed', async () => {
    legacyBytesPresent = true
    await useSqlDatabasesStore.getState().ensureLegacyMigration()
    expect(useSqlDatabasesStore.getState().userDatabases).toHaveLength(1)
    expect(useSqlDatabasesStore.getState().userDatabases[0].id).toBe('user-legacy-default')
    expect(useSqlDatabasesStore.getState().legacyMigrationDone).toBe(true)

    // Calling again must not duplicate, even though bytes are still "present".
    await useSqlDatabasesStore.getState().ensureLegacyMigration()
    expect(useSqlDatabasesStore.getState().userDatabases).toHaveLength(1)
  })

  it('does not register a legacy database when no legacy bytes exist', async () => {
    legacyBytesPresent = false
    await useSqlDatabasesStore.getState().ensureLegacyMigration()
    expect(useSqlDatabasesStore.getState().userDatabases).toHaveLength(0)
    expect(useSqlDatabasesStore.getState().legacyMigrationDone).toBe(true)
  })
})
