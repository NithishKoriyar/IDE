import { ecommercePreset } from './ecommerce'
import { employeesPreset } from './employees'
import { saasBookingPreset } from './saasBooking'
import type { SqlPresetDefinition } from './types'

export type { SqlPresetDefinition, SeedTable } from './types'
export { seedPresetDatabase } from './seed'

/** Ordered registry of built-in databases. Add a new preset by adding one more
 * definition here (and to this array) -- nothing else needs to change. */
export const SQL_PRESETS: SqlPresetDefinition[] = [ecommercePreset, employeesPreset, saasBookingPreset]

export const DEFAULT_DATABASE_ID = SQL_PRESETS[0].id

const presetsById = new Map(SQL_PRESETS.map((p) => [p.id, p]))

export function getPresetById(id: string): SqlPresetDefinition | undefined {
  return presetsById.get(id)
}

export function isPresetDatabaseId(id: string): boolean {
  return presetsById.has(id)
}
