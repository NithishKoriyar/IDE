import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import {
  deleteDbBytes,
  deleteDbMeta,
  loadDbBytes,
  loadDbMeta,
  saveDbBytes,
  saveDbMeta,
} from '../../../app/store/persistStorage'
import { getPresetById, isPresetDatabaseId, seedPresetDatabase } from './presets'

/** Table name -> ordered column names, for CodeMirror's SQL schema completion. */
export type SqlSchema = Record<string, string[]>

export interface SqlStatementResult {
  columns: string[]
  rows: unknown[][]
}

export interface SqlRunResult {
  results: SqlStatementResult[]
  execMs: number
  error: string | null
}

export interface TableInfo {
  name: string
  rowCount: number
}

const PERSIST_DEBOUNCE_MS = 300

let sqlJsPromise: Promise<SqlJsStatic> | null = null
function getSqlJs(): Promise<SqlJsStatic> {
  sqlJsPromise ??= initSqlJs({ locateFile: () => sqlWasmUrl })
  return sqlJsPromise
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/*
 * Multiple SQLite databases (the 3 built-in presets + any number of
 * user-created ones) can exist, but only one is ever "active" (loaded +
 * wired up to run/exec) at a time -- `currentId`/`currentDb` below play the
 * role the old single `db` singleton used to. Switching which one is active
 * (`setActiveDatabase`) flushes any pending debounced write for the outgoing
 * database first, so a quick switch right after a mutation never loses it.
 */
let currentId: string | null = null
let currentDb: Database | null = null
let currentReadyPromise: Promise<Database> | null = null
let persistTimeout: ReturnType<typeof setTimeout> | null = null

async function flushPendingPersist(): Promise<void> {
  if (persistTimeout !== null) {
    clearTimeout(persistTimeout)
    persistTimeout = null
  }
  if (currentDb && currentId) {
    await saveDbBytes(currentId, currentDb.export())
  }
}

function schedulePersist(): void {
  if (persistTimeout !== null) clearTimeout(persistTimeout)
  persistTimeout = setTimeout(() => {
    persistTimeout = null
    void flushPendingPersist()
  }, PERSIST_DEBOUNCE_MS)
}

/** Loads a database's saved bytes, or -- if none exist yet -- creates it fresh
 * (seeded from its preset definition, or genuinely empty for a user database). */
async function loadOrCreateDatabase(id: string): Promise<Database> {
  const SQL = await getSqlJs()
  const savedBytes = await loadDbBytes(id)
  if (savedBytes && savedBytes.length > 0) {
    try {
      return new SQL.Database(savedBytes)
    } catch {
      // Saved bytes are corrupt/unreadable -- fall through and reseed/recreate.
    }
  }
  const preset = getPresetById(id)
  const database = new SQL.Database()
  if (preset) {
    seedPresetDatabase(database, preset)
    await saveDbMeta(id, { seedVersion: preset.version })
  }
  await saveDbBytes(id, database.export())
  return database
}

/** Switches which database subsequent `runSql`/`getSchema`/etc. calls target.
 * Idempotent for the already-active id. Flushes the outgoing database's
 * pending write first so nothing is lost on a fast switch. */
export async function setActiveDatabase(id: string): Promise<void> {
  if (id === currentId && currentDb) return
  await flushPendingPersist()
  currentId = id
  currentDb = null
  const promise = loadOrCreateDatabase(id).then((database) => {
    currentDb = database
    return database
  })
  currentReadyPromise = promise
  await promise
}

export function getActiveDatabaseId(): string | null {
  return currentId
}

/** Resolves to the currently active database. Callers (the SQL workspace) are
 * expected to have called `setActiveDatabase` first; this never picks a
 * default on its own, since guessing wrong would mean running a query against
 * the wrong database. */
function getDatabase(): Promise<Database> {
  if (!currentReadyPromise) {
    throw new Error('No active SQL database -- call setActiveDatabase() first.')
  }
  return currentReadyPromise
}

/** Runs (possibly multiple `;`-separated) statements against the active
 * database. sql.js's exec() already skips non-row-producing statements, so
 * `results` naturally holds only the SELECT-like statements' output. */
export async function runSql(sql: string): Promise<SqlRunResult> {
  const database = await getDatabase()
  const start = performance.now()
  try {
    const execResult = database.exec(sql)
    const execMs = performance.now() - start
    schedulePersist()
    return {
      results: execResult.map((r) => ({ columns: r.columns, rows: r.values })),
      execMs,
      error: null,
    }
  } catch (err) {
    return {
      results: [],
      execMs: performance.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function getSchema(): Promise<SqlSchema> {
  const database = await getDatabase()
  const schema: SqlSchema = {}
  const tables = database.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  const tableNames = (tables[0]?.values ?? []).map((row) => String(row[0]))
  for (const name of tableNames) {
    const info = database.exec(`PRAGMA table_info(${quoteIdent(name)})`)
    schema[name] = (info[0]?.values ?? []).map((row) => String(row[1]))
  }
  return schema
}

export async function getTableRowCounts(): Promise<TableInfo[]> {
  const schema = await getSchema()
  const database = await getDatabase()
  return Object.keys(schema).map((name) => {
    const result = database.exec(`SELECT COUNT(*) FROM ${quoteIdent(name)}`)
    const rowCount = Number(result[0]?.values[0]?.[0] ?? 0)
    return { name, rowCount }
  })
}

export async function deleteTable(name: string): Promise<void> {
  const database = await getDatabase()
  database.run(`DROP TABLE IF EXISTS ${quoteIdent(name)}`)
  await flushPendingPersist()
}

/** Resets the *currently active* database back to its original preset seed.
 * No-op-unsafe to call on a user database -- callers should gate this behind
 * `isPresetDatabaseId(activeId)` in the UI. */
export async function resetActiveDatabaseToPreset(): Promise<void> {
  if (!currentId) return
  const preset = getPresetById(currentId)
  if (!preset) throw new Error(`"${currentId}" is not a preset database -- nothing to reset to.`)
  const SQL = await getSqlJs()
  currentDb?.close()
  const database = new SQL.Database()
  seedPresetDatabase(database, preset)
  currentDb = database
  currentReadyPromise = Promise.resolve(database)
  await saveDbMeta(currentId, { seedVersion: preset.version })
  await flushPendingPersist()
}

/** Permanently removes a database's persisted bytes + metadata. If it's the
 * active one, callers must switch away first (or immediately after). */
export async function deleteDatabaseStorage(id: string): Promise<void> {
  if (isPresetDatabaseId(id)) {
    throw new Error('Preset databases cannot be deleted, only reset.')
  }
  if (id === currentId) {
    currentId = null
    currentDb = null
    currentReadyPromise = null
  }
  await deleteDbBytes(id)
  await deleteDbMeta(id)
}

/** Forces any debounced write for the active database to disk immediately.
 * Exists mainly for tests (simulating a reload right after a mutation) --
 * normal app code can rely on the debounce plus the flush-on-switch above. */
export async function flushPendingWrites(): Promise<void> {
  await flushPendingPersist()
}

export { loadDbMeta }
