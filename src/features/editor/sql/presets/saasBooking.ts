import { addDays, addHours, pick } from './genUtils'
import type { SeedTable, SqlPresetDefinition } from './types'

const schemaSql = `
CREATE TABLE organizations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('free','starter','pro','enterprise')),
  created_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  created_at TEXT NOT NULL
);

CREATE TABLE staff (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE services (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (organization_id, email)
);

CREATE TABLE appointments (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  notes TEXT
);
`.trim()

// ---------------------------------------------------------------------------
// organizations (15) -- #15 is a brand-new tenant with zero staff/services/
// customers/appointments; #14 has staff/services/customers but zero
// appointments yet. Both are deliberate "no matching child" tenants.
// ---------------------------------------------------------------------------
const ORG_NAMES = [
  'Acme Hair Studio', 'Bright Smile Dental', 'Peak Fitness Club', 'Serenity Spa & Wellness',
  'Downtown Barbershop', 'Golden Paws Grooming', 'Elite Tennis Academy', 'Zen Yoga Collective',
  'Riverside Physiotherapy', 'Glow Skin Clinic', 'Metro Auto Detailing', 'Harmony Massage Therapy',
  'Blue Ridge Veterinary', 'Summit Tutoring Center', 'Fresh Start Yoga',
]
const PLANS = ['free', 'starter', 'starter', 'pro', 'enterprise'] as const
const INACTIVE_ORG_INDEXES = new Set([7]) // churned tenant -- filtering practice

const organizationRows = ORG_NAMES.map((name, i) => [
  i + 1,
  name,
  pick(PLANS, i),
  addDays('2022-04-01', i * 41),
  INACTIVE_ORG_INDEXES.has(i) ? 0 : 1,
])

// ---------------------------------------------------------------------------
// users (60) -- exactly 4 per org: 1 owner, 1 admin, 2 members.
// ---------------------------------------------------------------------------
const USER_ROLES = ['owner', 'admin', 'member', 'member'] as const
const STAFF_FIRST_NAMES = [
  'Ava', 'Leo', 'Mia', 'Noah', 'Zoe', 'Kai', 'Ivy', 'Max', 'Ana', 'Sam',
  'Ruby', 'Theo', 'Nia', 'Eli', 'Jade', 'Finn', 'Lena', 'Omar', 'Tara', 'Kian',
]
const LAST_NAMES = [
  'Turner', 'Brooks', 'Reyes', 'Coleman', 'Ward', 'Price', 'Bell', 'Foster', 'Diaz', 'Hayes',
  'Fox', 'Vance', 'Cruz', 'Marsh', 'Doyle',
]

const userSeedRows: (string | number | null)[][] = []
{
  let userId = 1
  for (let orgIdx = 0; orgIdx < 15; orgIdx++) {
    const orgId = orgIdx + 1
    for (let k = 0; k < 4; k++) {
      const first = pick(STAFF_FIRST_NAMES, userId)
      const last = pick(LAST_NAMES, userId * 2)
      userSeedRows.push([
        userId,
        orgId,
        `${first} ${last}`,
        `${first.toLowerCase()}.${last.toLowerCase()}${userId}@saasapp.example`,
        pick(USER_ROLES, k),
        addDays('2022-04-05', orgIdx * 41 + k * 3),
      ])
      userId += 1
    }
  }
}

// ---------------------------------------------------------------------------
// staff (50) -- per-org counts: orgs 1-10 -> 3 each, 11-14 -> 5 each, 15 -> 0.
// ---------------------------------------------------------------------------
const STAFF_COUNTS = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 0]
const STAFF_TITLES = ['Stylist', 'Senior Stylist', 'Practitioner', 'Specialist', 'Coordinator']

interface RangeById {
  ids: number[]
}
const staffByOrg: RangeById[] = Array.from({ length: 15 }, () => ({ ids: [] }))

const staffSeedRows: (string | number | null)[][] = []
{
  let staffId = 1
  STAFF_COUNTS.forEach((count, orgIdx) => {
    const orgId = orgIdx + 1
    for (let k = 0; k < count; k++) {
      staffByOrg[orgIdx].ids.push(staffId)
      const first = pick(STAFF_FIRST_NAMES, staffId * 3 + 1)
      const last = pick(LAST_NAMES, staffId)
      staffSeedRows.push([
        staffId,
        orgId,
        `${first} ${last}`,
        `${first.toLowerCase()}.${last.toLowerCase()}.staff${staffId}@saasapp.example`,
        pick(STAFF_TITLES, staffId),
        staffId % 19 === 0 ? 0 : 1, // a couple of inactive staff (former employees)
      ])
      staffId += 1
    }
  })
}

// ---------------------------------------------------------------------------
// services (40) -- per-org counts: orgs 1-12 -> 3 each, 13-14 -> 2 each, 15 -> 0.
// ---------------------------------------------------------------------------
const SERVICE_COUNTS = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 0]
const SERVICE_NAMES = ['Standard Session', 'Premium Session', 'Quick Consultation', 'Deep Treatment', 'Follow-up Visit']
const SERVICE_DURATIONS = [15, 30, 45, 60, 90]

const servicesByOrg: RangeById[] = Array.from({ length: 15 }, () => ({ ids: [] }))

const serviceSeedRows: (string | number | null)[][] = []
{
  let serviceId = 1
  SERVICE_COUNTS.forEach((count, orgIdx) => {
    const orgId = orgIdx + 1
    for (let k = 0; k < count; k++) {
      servicesByOrg[orgIdx].ids.push(serviceId)
      serviceSeedRows.push([
        serviceId,
        orgId,
        pick(SERVICE_NAMES, k),
        pick(SERVICE_DURATIONS, serviceId),
        15 + ((serviceId * 37) % 185),
        1,
      ])
      serviceId += 1
    }
  })
}

// ---------------------------------------------------------------------------
// customers (80) -- per-org counts: orgs 1-10 -> 6 each, 11-14 -> 5 each, 15 -> 0.
// ---------------------------------------------------------------------------
const CUSTOMER_COUNTS = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 0]
const CUSTOMER_FIRST_NAMES = [
  'Grace', 'Adam', 'Ella', 'Ryan', 'Chloe', 'Jack', 'Maya', 'Owen', 'Sara', 'Ben',
  'Nora', 'Cole', 'Hana', 'Levi', 'Iris', 'Drew', 'June', 'Seth', 'Wren', 'Cody',
]
const NO_PHONE_MOD = 7

const customersByOrg: RangeById[] = Array.from({ length: 15 }, () => ({ ids: [] }))

const customerSeedRows: (string | number | null)[][] = []
{
  let customerId = 1
  CUSTOMER_COUNTS.forEach((count, orgIdx) => {
    const orgId = orgIdx + 1
    for (let k = 0; k < count; k++) {
      customersByOrg[orgIdx].ids.push(customerId)
      const first = pick(CUSTOMER_FIRST_NAMES, customerId)
      const last = pick(LAST_NAMES, customerId * 5 + orgIdx)
      customerSeedRows.push([
        customerId,
        orgId,
        `${first} ${last}`,
        `${first.toLowerCase()}.${last.toLowerCase()}${customerId}@customer.example`,
        customerId % NO_PHONE_MOD === 0 ? null : `+1-555-${String(2000 + customerId * 3).padStart(4, '0')}`,
        addDays('2022-05-01', orgIdx * 30 + k * 6),
      ])
      customerId += 1
    }
  })
}

// ---------------------------------------------------------------------------
// appointments (90) -- per-org counts: orgs 1-3 -> 8, 4-9 -> 7, 10-13 -> 6,
// 14 & 15 -> 0 (org 14 has staff/customers but no bookings; org 15 has nothing).
// Every appointment's staff/customer/service belong to the SAME org (tenant integrity).
// ---------------------------------------------------------------------------
const APPOINTMENT_COUNTS = [8, 8, 8, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 0, 0]
const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'completed', 'cancelled', 'no_show'] as const

const appointmentSeedRows: (string | number | null)[][] = []
{
  let appointmentId = 1
  APPOINTMENT_COUNTS.forEach((count, orgIdx) => {
    const orgId = orgIdx + 1
    const orgStaff = staffByOrg[orgIdx].ids
    const orgCustomers = customersByOrg[orgIdx].ids
    const orgServices = servicesByOrg[orgIdx].ids
    for (let k = 0; k < count; k++) {
      const status = pick(APPOINTMENT_STATUSES, appointmentId)
      // Past dates for resolved appointments, future dates for still-'scheduled' ones.
      const dayOffset = status === 'scheduled' ? 3 + (k % 10) : -(3 + (k % 40))
      const service = pick(orgServices, appointmentId)
      appointmentSeedRows.push([
        appointmentId,
        orgId,
        pick(orgStaff, appointmentId + k),
        pick(orgCustomers, appointmentId * 2 + k),
        service,
        addHours(addDays('2024-06-15', dayOffset), (k % 8) * 2),
        pick(SERVICE_DURATIONS, service),
        status,
        appointmentId % 11 === 0 ? 'Rescheduled once at customer request.' : null,
      ])
      appointmentId += 1
    }
  })
}

// ---------------------------------------------------------------------------

const seedTables: SeedTable[] = [
  { table: 'organizations', columns: ['id', 'name', 'plan', 'created_at', 'is_active'], rows: organizationRows },
  { table: 'users', columns: ['id', 'organization_id', 'name', 'email', 'role', 'created_at'], rows: userSeedRows },
  {
    table: 'staff',
    columns: ['id', 'organization_id', 'name', 'email', 'title', 'is_active'],
    rows: staffSeedRows,
  },
  {
    table: 'services',
    columns: ['id', 'organization_id', 'name', 'duration_minutes', 'price', 'is_active'],
    rows: serviceSeedRows,
  },
  {
    table: 'customers',
    columns: ['id', 'organization_id', 'name', 'email', 'phone', 'created_at'],
    rows: customerSeedRows,
  },
  {
    table: 'appointments',
    columns: [
      'id', 'organization_id', 'staff_id', 'customer_id', 'service_id',
      'scheduled_at', 'duration_minutes', 'status', 'notes',
    ],
    rows: appointmentSeedRows,
  },
]

export const saasBookingPreset: SqlPresetDefinition = {
  id: 'preset-saas-booking',
  name: 'SaaS Appointment Booking DB',
  shortName: 'SaaS',
  description: 'Multi-tenant organizations, staff and customers booking appointments.',
  version: 1,
  schemaSql,
  seedTables,
}
