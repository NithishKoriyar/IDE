import { get, set, del } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

/**
 * Zustand `persist` StateStorage backed by IndexedDB (via idb-keyval) instead
 * of localStorage. Values passing through here are always the JSON strings
 * produced by `createJSONStorage` -- fine to round-trip through idb-keyval,
 * which stores arbitrary structured-cloneable values (a string included).
 *
 * The SQLite database's raw bytes must NEVER go through this path (that would
 * mean JSON.stringify-ing a Uint8Array, bloating it into a per-byte object).
 * Those are saved/loaded directly below, bypassing JSON entirely.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value)
  },
  removeItem: async (name) => {
    await del(name)
  },
}

const SQLITE_BYTES_KEY = 'localide:sqlite-db-bytes'

/**
 * Fixed id for the single SQLite database this app persisted before preset
 * databases existed. Its bytes stay under the original `SQLITE_BYTES_KEY`
 * (rather than being copied to a new per-id key) so upgrading never loses a
 * user's existing work -- `sqlDatabasesStore`'s legacy migration registers
 * this id as an ordinary user database the first time it finds bytes there.
 */
export const LEGACY_DEFAULT_DATABASE_ID = 'user-legacy-default'

function dbBytesKey(databaseId: string): string {
  return databaseId === LEGACY_DEFAULT_DATABASE_ID ? SQLITE_BYTES_KEY : `localide:sql-db-bytes:${databaseId}`
}

function dbMetaKey(databaseId: string): string {
  return `localide:sql-db-meta:${databaseId}`
}

/** Per-database seed/init bookkeeping -- survives reloads so a preset is only ever seeded once per version. */
export interface SqlDatabaseMeta {
  seedVersion: number
}

export async function hasLegacySqliteBytes(): Promise<boolean> {
  const bytes = await get<Uint8Array>(SQLITE_BYTES_KEY)
  return !!bytes && bytes.length > 0
}

export async function loadDbBytes(databaseId: string): Promise<Uint8Array | undefined> {
  return get(dbBytesKey(databaseId))
}

export async function saveDbBytes(databaseId: string, bytes: Uint8Array): Promise<void> {
  await set(dbBytesKey(databaseId), bytes)
}

export async function deleteDbBytes(databaseId: string): Promise<void> {
  await del(dbBytesKey(databaseId))
}

export async function loadDbMeta(databaseId: string): Promise<SqlDatabaseMeta | undefined> {
  return get(dbMetaKey(databaseId))
}

export async function saveDbMeta(databaseId: string, meta: SqlDatabaseMeta): Promise<void> {
  await set(dbMetaKey(databaseId), meta)
}

export async function deleteDbMeta(databaseId: string): Promise<void> {
  await del(dbMetaKey(databaseId))
}

/** Best-effort request that the browser not evict this origin's storage under disk pressure. */
export function initStoragePersistence(): void {
  if (navigator.storage?.persist) {
    void navigator.storage.persist()
  }
}
