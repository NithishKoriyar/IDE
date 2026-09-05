/** A single seed table's rows, applied via a parameterized INSERT (no manual SQL-escaping). */
export interface SeedTable {
  table: string
  columns: string[]
  rows: ReadonlyArray<ReadonlyArray<string | number | null>>
}

/**
 * A self-contained preset database: schema + seed data + a version used to
 * detect "this preset's shape changed in code" (see sqliteEngine's init flow).
 * Adding a new preset means adding one more object shaped like this to `PRESETS`
 * in `index.ts` -- nothing else in the app needs to know its internals.
 */
export interface SqlPresetDefinition {
  id: string
  name: string
  /** Short label for the collapsed database selector trigger (the full `name` is used inside the open dropdown list). */
  shortName: string
  description: string
  /** Bump when schemaSql/seedTables change so a fresh install re-seeds instead of reusing a stale cached shape. */
  version: number
  /** CREATE TABLE statements only -- executed once, before seedTables are inserted. */
  schemaSql: string
  /** Insert order matters: parent tables (referenced by FK) must come before their children. */
  seedTables: SeedTable[]
}
