import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { loadSqliteBytes, saveSqliteBytes } from '../../../app/store/persistStorage'

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

let db: Database | null = null
let dbReadyPromise: Promise<Database> | null = null
let persistTimeout: ReturnType<typeof setTimeout> | null = null

async function persistNow(): Promise<void> {
  if (!db) return
  await saveSqliteBytes(db.export())
}

function schedulePersist(): void {
  if (persistTimeout !== null) clearTimeout(persistTimeout)
  persistTimeout = setTimeout(() => {
    void persistNow()
  }, PERSIST_DEBOUNCE_MS)
}

/** A genuinely empty database -- Page 1's starter template is what the user
 * runs themselves to create the first table. Pre-running that same SQL here
 * would make the user's own first Run collide with an already-existing
 * "Users" table ("table Users already exists"). */
function createSeededDatabase(SQL: SqlJsStatic): Database {
  return new SQL.Database()
}

/** Lazily initializes sql.js and loads the persisted database (or seeds a fresh one). Idempotent. */
export function getDatabase(): Promise<Database> {
  dbReadyPromise ??= (async () => {
    const SQL = await getSqlJs()
    const savedBytes = await loadSqliteBytes()
    if (savedBytes && savedBytes.length > 0) {
      try {
        db = new SQL.Database(savedBytes)
        return db
      } catch {
        // Saved bytes are corrupt/unreadable -- fall through to a fresh seeded database.
      }
    }
    db = createSeededDatabase(SQL)
    await persistNow()
    return db
  })()
  return dbReadyPromise
}

/** Runs (possibly multiple `;`-separated) statements. sql.js's exec() already
 * skips non-row-producing statements, so `results` naturally holds only the
 * SELECT-like statements' output -- no manual statement splitting needed. */
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
  await persistNow()
}

export async function resetDemoDatabase(): Promise<void> {
  const SQL = await getSqlJs()
  db?.close()
  db = createSeededDatabase(SQL)
  dbReadyPromise = Promise.resolve(db)
  await persistNow()
}
