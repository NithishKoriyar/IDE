import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory stand-ins for IndexedDB, declared outside the mock factory so the
// same backing Maps survive `vi.resetModules()` -- that's what lets the
// "simulate an app reload" tests below actually simulate a reload (fresh
// module state) while keeping the "persisted" bytes/meta intact.
const fakeBytesStore = new Map<string, Uint8Array>()
const fakeMetaStore = new Map<string, { seedVersion: number }>()

vi.mock('../../../app/store/persistStorage', () => ({
  loadDbBytes: (id: string) => fakeBytesStore.get(id),
  saveDbBytes: (id: string, bytes: Uint8Array) => {
    fakeBytesStore.set(id, bytes)
  },
  deleteDbBytes: (id: string) => {
    fakeBytesStore.delete(id)
  },
  loadDbMeta: (id: string) => fakeMetaStore.get(id),
  saveDbMeta: (id: string, meta: { seedVersion: number }) => {
    fakeMetaStore.set(id, meta)
  },
  deleteDbMeta: (id: string) => {
    fakeMetaStore.delete(id)
  },
}))

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
}))

async function freshEngine() {
  vi.resetModules()
  return import('./sqliteEngine')
}

function count(rows: number[][] | undefined): number {
  return Number(rows?.[0]?.[0] ?? 0)
}

beforeEach(() => {
  fakeBytesStore.clear()
  fakeMetaStore.clear()
  // Every runSql() schedules a real 300ms debounced persist. Tests always flush
  // explicitly via flushPendingWrites(), but a test that forgets to would leave
  // a real timer alive past `vi.resetModules()` (which only clears the module
  // cache, not pending timers) -- it could then fire mid-way through a LATER
  // test and overwrite that test's data in the shared fake store. Fake timers
  // mean `vi.useRealTimers()` below discards any such stragglers instead.
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
})

describe('sqliteEngine: initialization', () => {
  it('seeds a fresh preset database with its schema and seed data', async () => {
    const engine = await freshEngine()
    await engine.setActiveDatabase('preset-ecommerce')
    const schema = await engine.getSchema()
    expect(Object.keys(schema).sort()).toEqual(
      ['categories', 'customers', 'order_items', 'orders', 'payments', 'products'].sort(),
    )
    const result = await engine.runSql('SELECT COUNT(*) FROM categories')
    expect(count(result.results[0]?.rows as number[][])).toBe(10)
  })

  it('records a seed-version marker that survives a reload', async () => {
    const engine = await freshEngine()
    await engine.setActiveDatabase('preset-ecommerce')
    expect(fakeMetaStore.get('preset-ecommerce')).toEqual({ seedVersion: 1 })
  })

  it('creates a genuinely empty database for a non-preset (user) id', async () => {
    const engine = await freshEngine()
    await engine.setActiveDatabase('user-test-1')
    const schema = await engine.getSchema()
    expect(Object.keys(schema)).toEqual([])
  })
})

describe('sqliteEngine: persistence + idempotent init', () => {
  it('keeps a modification after simulating an app reload, without duplicating seed rows', async () => {
    const engine1 = await freshEngine()
    await engine1.setActiveDatabase('preset-ecommerce')
    await engine1.runSql("UPDATE customers SET city = 'Bangalore' WHERE id = 1")
    await engine1.flushPendingWrites()

    const engine2 = await freshEngine()
    await engine2.setActiveDatabase('preset-ecommerce')

    const city = await engine2.runSql('SELECT city FROM customers WHERE id = 1')
    expect(city.results[0]?.rows[0]?.[0]).toBe('Bangalore')

    const categoryCount = await engine2.runSql('SELECT COUNT(*) FROM categories')
    expect(count(categoryCount.results[0]?.rows as number[][])).toBe(10) // not re-seeded/duplicated
  })

  it('does not bring back a deleted row on a normal reload (no silent reseed)', async () => {
    const engine1 = await freshEngine()
    await engine1.setActiveDatabase('preset-ecommerce')
    await engine1.runSql('DELETE FROM customers WHERE id = 1')
    await engine1.flushPendingWrites()

    const engine2 = await freshEngine()
    await engine2.setActiveDatabase('preset-ecommerce')
    const remaining = await engine2.runSql('SELECT COUNT(*) FROM customers WHERE id = 1')
    expect(count(remaining.results[0]?.rows as number[][])).toBe(0)
  })

  it('persists a user-created database across a reload', async () => {
    const engine1 = await freshEngine()
    await engine1.setActiveDatabase('user-test-1')
    await engine1.runSql('CREATE TABLE notes (id INTEGER PRIMARY KEY, text TEXT)')
    await engine1.runSql("INSERT INTO notes (text) VALUES ('hello')")
    await engine1.flushPendingWrites()

    const engine2 = await freshEngine()
    await engine2.setActiveDatabase('user-test-1')
    const rows = await engine2.runSql('SELECT text FROM notes')
    expect(rows.results[0]?.rows[0]?.[0]).toBe('hello')
  })
})

describe('sqliteEngine: reset', () => {
  it('restores original seed data after modification, and refuses on a user database', async () => {
    const engine = await freshEngine()
    await engine.setActiveDatabase('preset-ecommerce')
    await engine.runSql('DELETE FROM customers WHERE id = 1')
    await engine.runSql("UPDATE customers SET city = 'Nowhere' WHERE id = 2")

    await engine.resetActiveDatabaseToPreset()

    const restored = await engine.runSql('SELECT COUNT(*) FROM customers WHERE id = 1')
    expect(count(restored.results[0]?.rows as number[][])).toBe(1)
    const total = await engine.runSql('SELECT COUNT(*) FROM customers')
    expect(count(total.results[0]?.rows as number[][])).toBe(50)

    await engine.setActiveDatabase('user-test-1')
    await expect(engine.resetActiveDatabaseToPreset()).rejects.toThrow()
  })
})

describe('sqliteEngine: isolation', () => {
  it('keeps preset databases independent -- mutating one never touches another', async () => {
    const engine = await freshEngine()
    await engine.setActiveDatabase('preset-ecommerce')
    await engine.runSql('DELETE FROM customers WHERE id = 1')

    await engine.setActiveDatabase('preset-employees')
    const schema = await engine.getSchema()
    expect(Object.keys(schema)).toContain('departments')
    expect(Object.keys(schema)).not.toContain('customers')
    const departmentCount = await engine.runSql('SELECT COUNT(*) FROM departments')
    expect(count(departmentCount.results[0]?.rows as number[][])).toBe(8)

    await engine.setActiveDatabase('preset-ecommerce')
    const remaining = await engine.runSql('SELECT COUNT(*) FROM customers')
    expect(count(remaining.results[0]?.rows as number[][])).toBe(49) // the earlier delete stuck; unaffected by the switch
  })

  it('deleting a user database removes only that database', async () => {
    const engine = await freshEngine()
    await engine.setActiveDatabase('user-a')
    await engine.runSql('CREATE TABLE t (id INTEGER PRIMARY KEY)')
    await engine.flushPendingWrites()
    await engine.setActiveDatabase('user-b')
    await engine.runSql('CREATE TABLE t (id INTEGER PRIMARY KEY)')
    await engine.flushPendingWrites()

    await engine.deleteDatabaseStorage('user-a')

    expect(fakeBytesStore.has('user-a')).toBe(false)
    expect(fakeBytesStore.has('user-b')).toBe(true)

    await expect(engine.deleteDatabaseStorage('preset-ecommerce')).rejects.toThrow()
  })
})
