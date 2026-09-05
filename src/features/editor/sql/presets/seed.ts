import type { Database } from 'sql.js'
import type { SqlPresetDefinition } from './types'

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/** Runs a preset's DDL, then inserts its seed rows via parameterized statements
 * (no string-built SQL for values, so names like "O'Brien" need no escaping). */
export function seedPresetDatabase(database: Database, preset: SqlPresetDefinition): void {
  database.run(preset.schemaSql)
  for (const table of preset.seedTables) {
    const columnList = table.columns.map(quoteIdent).join(', ')
    const placeholders = table.columns.map(() => '?').join(', ')
    const stmt = database.prepare(`INSERT INTO ${quoteIdent(table.table)} (${columnList}) VALUES (${placeholders})`)
    try {
      for (const row of table.rows) {
        stmt.run(row as (string | number | null)[])
      }
    } finally {
      stmt.free()
    }
  }
}
