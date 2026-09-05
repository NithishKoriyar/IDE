import { useCallback, useEffect, useState } from 'react'
import {
  getSchema,
  getTableRowCounts,
  deleteTable as engineDeleteTable,
  resetActiveDatabaseToPreset,
  runSql,
  setActiveDatabase,
  type SqlRunResult,
  type SqlSchema,
  type TableInfo,
} from './sqliteEngine'

interface UseSqlDatabaseResult {
  isReady: boolean
  schema: SqlSchema
  tables: TableInfo[]
  runQuery: (sql: string) => Promise<SqlRunResult>
  refreshTables: () => Promise<void>
  deleteTable: (name: string) => Promise<void>
  resetDatabase: () => Promise<void>
}

/** React wrapper around the sql.js singleton service -- schema/tables refresh
 * after every run/mutation, and switching `databaseId` loads (or seeds) that
 * database and makes it the one `runSql`/etc. operate against. */
export function useSqlDatabase(databaseId: string): UseSqlDatabaseResult {
  const [isReady, setIsReady] = useState(false)
  const [schema, setSchema] = useState<SqlSchema>({})
  const [tables, setTables] = useState<TableInfo[]>([])

  const refreshTables = useCallback(async () => {
    const [nextSchema, nextTables] = await Promise.all([getSchema(), getTableRowCounts()])
    setSchema(nextSchema)
    setTables(nextTables)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsReady(false)
    void (async () => {
      await setActiveDatabase(databaseId)
      if (cancelled) return
      setIsReady(true)
      await refreshTables()
    })()
    return () => {
      cancelled = true
    }
  }, [databaseId, refreshTables])

  const runQuery = useCallback(
    async (sql: string) => {
      const result = await runSql(sql)
      await refreshTables()
      return result
    },
    [refreshTables],
  )

  const deleteTable = useCallback(
    async (name: string) => {
      await engineDeleteTable(name)
      await refreshTables()
    },
    [refreshTables],
  )

  const resetDatabase = useCallback(async () => {
    await resetActiveDatabaseToPreset()
    await refreshTables()
  }, [refreshTables])

  return { isReady, schema, tables, runQuery, refreshTables, deleteTable, resetDatabase }
}
