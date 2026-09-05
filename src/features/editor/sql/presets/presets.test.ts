import path from 'node:path'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { ecommercePreset } from './ecommerce'
import { employeesPreset } from './employees'
import { saasBookingPreset } from './saasBooking'
import { seedPresetDatabase } from './seed'
import { SQL_PRESETS, getPresetById, isPresetDatabaseId } from './index'

let SQL: SqlJsStatic

beforeAll(async () => {
  const wasmPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm')
  SQL = await initSqlJs({ locateFile: () => wasmPath })
})

function seeded(presetId: string): Database {
  const preset = getPresetById(presetId)
  if (!preset) throw new Error(`unknown preset ${presetId}`)
  const db = new SQL.Database()
  seedPresetDatabase(db, preset)
  return db
}

function count(db: Database, sql: string): number {
  return Number(db.exec(sql)[0]?.values[0]?.[0] ?? 0)
}

function orphanCount(db: Database, child: string, column: string, parent: string, parentIdCol = 'id'): number {
  return count(
    db,
    `SELECT COUNT(*) FROM ${child} WHERE ${column} IS NOT NULL AND ${column} NOT IN (SELECT ${parentIdCol} FROM ${parent})`,
  )
}

describe('preset registry', () => {
  it('exposes exactly the three specified presets, each row-count-bounded', () => {
    expect(SQL_PRESETS.map((p) => p.id)).toEqual(['preset-ecommerce', 'preset-employees', 'preset-saas-booking'])
    expect(isPresetDatabaseId('preset-ecommerce')).toBe(true)
    expect(isPresetDatabaseId('some-user-db')).toBe(false)
  })
})

describe('ecommerce preset', () => {
  let db: Database
  beforeAll(() => {
    db = seeded(ecommercePreset.id)
  })

  it('creates every table with the specified row count (<=100)', () => {
    const expected: Record<string, number> = {
      categories: 10,
      products: 60,
      customers: 50,
      orders: 80,
      order_items: 90,
      payments: 80,
    }
    for (const [table, rows] of Object.entries(expected)) {
      expect(count(db, `SELECT COUNT(*) FROM ${table}`)).toBe(rows)
      expect(rows).toBeLessThanOrEqual(100)
    }
  })

  it('has no orphaned foreign keys', () => {
    expect(orphanCount(db, 'products', 'category_id', 'categories')).toBe(0)
    expect(orphanCount(db, 'orders', 'customer_id', 'customers')).toBe(0)
    expect(orphanCount(db, 'order_items', 'order_id', 'orders')).toBe(0)
    expect(orphanCount(db, 'order_items', 'product_id', 'products')).toBe(0)
    expect(orphanCount(db, 'payments', 'order_id', 'orders')).toBe(0)
  })

  it('contains the deliberate edge cases the schema was designed to exercise', () => {
    expect(count(db, 'SELECT COUNT(*) FROM products WHERE category_id IS NULL')).toBeGreaterThan(0)
    expect(count(db, 'SELECT COUNT(*) FROM customers WHERE city IS NULL')).toBeGreaterThan(0)
    expect(count(db, 'SELECT COUNT(*) FROM customers WHERE phone IS NULL')).toBeGreaterThan(0)
    // customers with zero orders (LEFT JOIN / NOT EXISTS practice)
    expect(
      count(db, 'SELECT COUNT(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)'),
    ).toBeGreaterThan(0)
    // orders with zero line items
    expect(
      count(db, 'SELECT COUNT(*) FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id)'),
    ).toBeGreaterThan(0)
    // products never ordered
    expect(
      count(db, 'SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.product_id = p.id)'),
    ).toBeGreaterThan(0)
    // orders with no payment row at all
    expect(
      count(db, 'SELECT COUNT(*) FROM orders o WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id)'),
    ).toBeGreaterThan(0)
    // multiple statuses represented
    expect(count(db, "SELECT COUNT(DISTINCT status) FROM orders")).toBeGreaterThanOrEqual(4)
  })

  it('supports INNER JOIN vs LEFT JOIN producing visibly different result sizes', () => {
    const inner = count(db, 'SELECT COUNT(*) FROM customers c INNER JOIN orders o ON o.customer_id = c.id')
    const left = count(db, 'SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id')
    expect(left).toBeGreaterThan(inner)
  })

  it('supports GROUP BY + HAVING', () => {
    const res = db.exec(
      `SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id HAVING COUNT(*) >= 3`,
    )
    expect(res[0]?.values.length ?? 0).toBeGreaterThan(0)
  })

  it('supports correlated subqueries', () => {
    const res = db.exec(`
      SELECT p.name FROM products p
      WHERE p.price > (SELECT AVG(price) FROM products p2 WHERE p2.category_id = p.category_id)
    `)
    expect(res[0]?.values.length ?? 0).toBeGreaterThan(0)
  })

  it('supports CTEs', () => {
    const res = db.exec(`
      WITH order_totals AS (
        SELECT order_id, SUM(quantity * unit_price) AS total FROM order_items GROUP BY order_id
      )
      SELECT COUNT(*) FROM order_totals WHERE total > 0
    `)
    expect(Number(res[0]?.values[0]?.[0])).toBeGreaterThan(0)
  })

  it('supports window functions', () => {
    const res = db.exec(`
      SELECT id, price, RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS price_rank FROM products
    `)
    expect(res[0]?.values.length).toBe(60)
  })
})

describe('employees preset', () => {
  let db: Database
  beforeAll(() => {
    db = seeded(employeesPreset.id)
  })

  it('creates every table with the specified row count (<=100)', () => {
    const expected: Record<string, number> = {
      departments: 8,
      job_roles: 12,
      employees: 60,
      projects: 30,
      employee_projects: 80,
      attendance: 90,
    }
    for (const [table, rows] of Object.entries(expected)) {
      expect(count(db, `SELECT COUNT(*) FROM ${table}`)).toBe(rows)
    }
  })

  it('has no orphaned foreign keys, including the self-referencing manager_id', () => {
    expect(orphanCount(db, 'employees', 'department_id', 'departments')).toBe(0)
    expect(orphanCount(db, 'employees', 'job_role_id', 'job_roles')).toBe(0)
    expect(orphanCount(db, 'employees', 'manager_id', 'employees')).toBe(0)
    expect(orphanCount(db, 'employee_projects', 'employee_id', 'employees')).toBe(0)
    expect(orphanCount(db, 'employee_projects', 'project_id', 'projects')).toBe(0)
    expect(orphanCount(db, 'attendance', 'employee_id', 'employees')).toBe(0)
  })

  it('contains the deliberate edge cases the schema was designed to exercise', () => {
    // a department with zero employees
    expect(
      count(db, 'SELECT COUNT(*) FROM departments d WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id)'),
    ).toBeGreaterThan(0)
    // top-of-chain employees with NULL manager_id
    expect(count(db, 'SELECT COUNT(*) FROM employees WHERE manager_id IS NULL')).toBeGreaterThan(0)
    // employees with zero project assignments
    expect(
      count(db, 'SELECT COUNT(*) FROM employees e WHERE NOT EXISTS (SELECT 1 FROM employee_projects ep WHERE ep.employee_id = e.id)'),
    ).toBeGreaterThan(0)
    // projects with zero assigned employees
    expect(
      count(db, 'SELECT COUNT(*) FROM projects p WHERE NOT EXISTS (SELECT 1 FROM employee_projects ep WHERE ep.project_id = p.id)'),
    ).toBeGreaterThan(0)
    // multiple employment statuses represented
    expect(count(db, 'SELECT COUNT(DISTINCT status) FROM employees')).toBeGreaterThanOrEqual(3)
  })

  it('supports a self-join to pair employees with their manager', () => {
    const res = db.exec(`
      SELECT e.first_name, m.first_name AS manager_name
      FROM employees e JOIN employees m ON e.manager_id = m.id
    `)
    expect(res[0]?.values.length ?? 0).toBeGreaterThan(0)
  })

  it('supports aggregate + GROUP BY salary analysis per department', () => {
    const res = db.exec('SELECT department_id, AVG(salary) FROM employees GROUP BY department_id')
    expect(res[0]?.values.length).toBe(7) // 7 departments actually have employees
  })
})

describe('saas booking preset', () => {
  let db: Database
  beforeAll(() => {
    db = seeded(saasBookingPreset.id)
  })

  it('creates every table with the specified row count (<=100)', () => {
    const expected: Record<string, number> = {
      organizations: 15,
      users: 60,
      staff: 50,
      services: 40,
      customers: 80,
      appointments: 90,
    }
    for (const [table, rows] of Object.entries(expected)) {
      expect(count(db, `SELECT COUNT(*) FROM ${table}`)).toBe(rows)
    }
  })

  it('has no orphaned foreign keys', () => {
    expect(orphanCount(db, 'users', 'organization_id', 'organizations')).toBe(0)
    expect(orphanCount(db, 'staff', 'organization_id', 'organizations')).toBe(0)
    expect(orphanCount(db, 'services', 'organization_id', 'organizations')).toBe(0)
    expect(orphanCount(db, 'customers', 'organization_id', 'organizations')).toBe(0)
    expect(orphanCount(db, 'appointments', 'organization_id', 'organizations')).toBe(0)
    expect(orphanCount(db, 'appointments', 'staff_id', 'staff')).toBe(0)
    expect(orphanCount(db, 'appointments', 'customer_id', 'customers')).toBe(0)
    expect(orphanCount(db, 'appointments', 'service_id', 'services')).toBe(0)
  })

  it('keeps every appointment tenant-scoped: staff/customer/service belong to the appointment\'s own org', () => {
    const mismatches = count(
      db,
      `SELECT COUNT(*) FROM appointments a
       JOIN staff s ON s.id = a.staff_id
       JOIN customers c ON c.id = a.customer_id
       JOIN services sv ON sv.id = a.service_id
       WHERE a.organization_id != s.organization_id
          OR a.organization_id != c.organization_id
          OR a.organization_id != sv.organization_id`,
    )
    expect(mismatches).toBe(0)
  })

  it('contains a fully empty tenant and a tenant with no bookings yet', () => {
    expect(count(db, "SELECT COUNT(*) FROM staff WHERE organization_id = 15")).toBe(0)
    expect(count(db, "SELECT COUNT(*) FROM appointments WHERE organization_id = 15")).toBe(0)
    expect(count(db, "SELECT COUNT(*) FROM staff WHERE organization_id = 14")).toBeGreaterThan(0)
    expect(count(db, "SELECT COUNT(*) FROM appointments WHERE organization_id = 14")).toBe(0)
  })

  it('supports organization-scoped (tenant-level) aggregate queries', () => {
    const res = db.exec(`
      SELECT organization_id, COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM appointments GROUP BY organization_id
    `)
    expect(res[0]?.values.length ?? 0).toBeGreaterThan(0)
  })

  it('supports UNION of two status subsets', () => {
    const res = db.exec(`
      SELECT id FROM appointments WHERE status = 'cancelled'
      UNION
      SELECT id FROM appointments WHERE status = 'no_show'
    `)
    const cancelled = count(db, "SELECT COUNT(*) FROM appointments WHERE status = 'cancelled'")
    const noShow = count(db, "SELECT COUNT(*) FROM appointments WHERE status = 'no_show'")
    expect(res[0]?.values.length).toBeLessThanOrEqual(cancelled + noShow)
    expect(res[0]?.values.length).toBeGreaterThan(0)
  })
})
