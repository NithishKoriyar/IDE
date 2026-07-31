import { sql, SQLite } from '@codemirror/lang-sql'
import type { Extension } from '@codemirror/state'
import type { SqlSchema } from './sqliteEngine'

/**
 * Builds the SQL LanguageSupport extension. `@codemirror/lang-sql`'s built-in
 * schema/keyword completion sources cover "live table names, column names,
 * keywords" for free -- `SqlSchema` (table -> column names) is already
 * structurally a valid `SQLNamespace`, no conversion needed.
 */
export function buildSqlLanguageExtension(schema: SqlSchema, upperCaseKeywords: boolean): Extension {
  return sql({
    dialect: SQLite,
    schema,
    upperCaseKeywords,
  })
}
