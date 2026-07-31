import { useCallback, useEffect, useState } from 'react'
import {
  getDatabase,
  getSchema,
  getTableRowCounts,
  deleteTable as engineDeleteTable,
  resetDemoDatabase as engineResetDemoDatabase,
  runSql,
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

/** React wrapper around the sql.js singleton service -- schema/tables refresh after every run/mutation. */
export function useSqlDatabase(): UseSqlDatabaseResult {
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
    void (async () => {
      await getDatabase()
      if (cancelled) return
      setIsReady(true)
      await refreshTables()
    })()
    return () => {
      cancelled = true
    }
  }, [refreshTables])

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
    await engineResetDemoDatabase()
    await refreshTables()
  }, [refreshTables])

  return { isReady, schema, tables, runQuery, refreshTables, deleteTable, resetDatabase }
}
