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

export async function loadSqliteBytes(): Promise<Uint8Array | undefined> {
  return get(SQLITE_BYTES_KEY)
}

export async function saveSqliteBytes(bytes: Uint8Array): Promise<void> {
  await set(SQLITE_BYTES_KEY, bytes)
}

export async function clearSqliteBytes(): Promise<void> {
  await del(SQLITE_BYTES_KEY)
}

/** Best-effort request that the browser not evict this origin's storage under disk pressure. */
export function initStoragePersistence(): void {
  if (navigator.storage?.persist) {
    void navigator.storage.persist()
  }
}
