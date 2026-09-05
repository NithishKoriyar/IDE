import { addDays, pick } from './genUtils'
import type { SeedTable, SqlPresetDefinition } from './types'

const schemaSql = `
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  budget REAL NOT NULL
);

CREATE TABLE job_roles (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL,
  min_salary REAL NOT NULL,
  max_salary REAL NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  job_role_id INTEGER NOT NULL REFERENCES job_roles(id),
  manager_id INTEGER REFERENCES employees(id),
  hire_date TEXT NOT NULL,
  salary REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','on_leave','terminated')),
  termination_date TEXT
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  budget REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned','active','completed','on_hold'))
);

CREATE TABLE employee_projects (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  role_on_project TEXT NOT NULL,
  hours_allocated INTEGER NOT NULL,
  UNIQUE (employee_id, project_id)
);

CREATE TABLE attendance (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','remote')),
  check_in TEXT,
  check_out TEXT
);
`.trim()

// ---------------------------------------------------------------------------
// departments (8) -- 'Legal' deliberately has zero employees (no-matching-child practice).
// ---------------------------------------------------------------------------
const DEPARTMENTS = [
  ['Engineering', 'San Francisco', 4200000],
  ['Sales', 'New York', 2100000],
  ['Marketing', 'New York', 1300000],
  ['Human Resources', 'Chicago', 700000],
  ['Finance', 'Chicago', 900000],
  ['Customer Support', 'Austin', 1100000],
  ['Product', 'San Francisco', 1600000],
  ['Legal', 'New York', 500000],
] as const

const departmentRows = DEPARTMENTS.map(([name, location, budget], i) => [i + 1, name, location, budget])

// ---------------------------------------------------------------------------
// job_roles (12)
// ---------------------------------------------------------------------------
const JOB_ROLES = [
  ['Software Engineer I', 'Junior', 65000, 80000],
  ['Software Engineer II', 'Mid', 80000, 100000],
  ['Senior Software Engineer', 'Senior', 100000, 130000],
  ['Engineering Manager', 'Manager', 120000, 150000],
  ['Sales Representative', 'Junior', 45000, 60000],
  ['Sales Manager', 'Manager', 90000, 120000],
  ['Marketing Specialist', 'Mid', 55000, 70000],
  ['Marketing Manager', 'Manager', 85000, 105000],
  ['HR Generalist', 'Mid', 50000, 65000],
  ['Financial Analyst', 'Mid', 60000, 80000],
  ['Customer Support Specialist', 'Junior', 40000, 55000],
  ['Product Manager', 'Senior', 100000, 130000],
] as const

const jobRoleRows = JOB_ROLES.map(([title, level, min, max], i) => [i + 1, title, level, min, max])

// ---------------------------------------------------------------------------
// employees (60) -- spread across departments 1-7 (Legal=8 gets none). Each
// department's first employee is its manager (manager_id NULL); everyone else
// in the department reports to them (self-join practice).
// ---------------------------------------------------------------------------
const DEPARTMENT_HEADCOUNT = [15, 10, 8, 6, 6, 8, 7] // sums to 60, one entry per non-Legal department
const DEPARTMENT_ROLE_POOLS = [
  { manager: 4, individual: [1, 2, 3] }, // Engineering
  { manager: 6, individual: [5] }, // Sales
  { manager: 8, individual: [7] }, // Marketing
  { manager: 9, individual: [9] }, // Human Resources
  { manager: 10, individual: [10] }, // Finance
  { manager: 11, individual: [11] }, // Customer Support
  { manager: 12, individual: [12] }, // Product
]

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
]
const LAST_NAMES = [
  'Nguyen', 'Kim', 'Patel', 'Chen', 'Silva', 'Kowalski', 'Rossi', 'Muller', 'Dubois', 'Andersson',
  'Okafor', 'Haddad', 'Ivanov', 'Yamamoto', 'Costa', 'Fischer', 'Novak', 'Sato', 'Baker', 'Reed',
]

interface EmployeeRow {
  id: number
  firstName: string
  lastName: string
  departmentId: number
  jobRoleId: number
  managerId: number | null
  hireDate: string
  salaryBand: readonly [number, number]
  status: 'active' | 'on_leave' | 'terminated'
}

const employeeRows: EmployeeRow[] = []
{
  let employeeId = 1
  DEPARTMENT_HEADCOUNT.forEach((count, deptIdx) => {
    const departmentId = deptIdx + 1
    const pool = DEPARTMENT_ROLE_POOLS[deptIdx]
    let managerId: number | null = null
    for (let k = 0; k < count; k++) {
      const isManager = k === 0
      const jobRoleId = isManager ? pool.manager : pick(pool.individual, k)
      const role = JOB_ROLES[jobRoleId - 1]
      let status: EmployeeRow['status'] = 'active'
      if (!isManager && employeeId % 17 === 5) status = 'on_leave'
      if (!isManager && employeeId % 23 === 11) status = 'terminated'
      employeeRows.push({
        id: employeeId,
        firstName: pick(FIRST_NAMES, employeeId),
        lastName: pick(LAST_NAMES, employeeId * 3 + 2),
        departmentId,
        jobRoleId,
        managerId: isManager ? null : managerId,
        hireDate: addDays('2019-01-07', employeeId * 23),
        salaryBand: [role[2], role[3]],
        status,
      })
      if (isManager) managerId = employeeId
      employeeId += 1
    }
  })
}

const employeeSeedRows = employeeRows.map((e) => {
  const [min, max] = e.salaryBand
  const salary = Math.round(min + ((e.id * 997) % (max - min)))
  const terminationDate = e.status === 'terminated' ? addDays(e.hireDate, 400 + e.id * 5) : null
  return [
    e.id,
    e.firstName,
    e.lastName,
    `${e.firstName.toLowerCase()}.${e.lastName.toLowerCase()}${e.id}@corp.example`,
    e.departmentId,
    e.jobRoleId,
    e.managerId,
    e.hireDate,
    salary,
    e.status,
    terminationDate,
  ]
})

// ---------------------------------------------------------------------------
// projects (30)
// ---------------------------------------------------------------------------
const PROJECT_NAMES = [
  'Website Redesign', 'Mobile App Launch', 'Cloud Migration', 'Q3 Marketing Push', 'Sales CRM Rollout',
  'Payroll System Upgrade', 'Customer Portal Revamp', 'Data Warehouse Build', 'Employee Onboarding Tool',
  'API Platform v2', 'Brand Refresh', 'Support Ticketing Overhaul', 'Inventory Tracker', 'Security Audit 2024',
  'Internal Wiki Launch', 'Performance Review Tool', 'Vendor Portal', 'Analytics Dashboard', 'Localization Phase 1',
  'Localization Phase 2', 'Checkout Optimization', 'Accessibility Audit', 'Recruiting Pipeline Tool',
  'Expense Automation', 'Contract Management System', 'Product Launch: Nova', 'Product Launch: Nova Phase 2',
  'Legacy System Retirement', 'Office Relocation', 'Partner Integration Hub',
]
const PROJECT_STATUSES = ['planned', 'active', 'active', 'completed', 'on_hold'] as const

const projectSeedRows = PROJECT_NAMES.map((name, i) => {
  const id = i + 1
  const status = pick(PROJECT_STATUSES, i)
  const startDate = addDays('2023-01-10', i * 19)
  const endDate = status === 'completed' ? addDays(startDate, 120 + (i % 5) * 10) : null
  const budget = 20000 + ((i * 8191) % 480000)
  return [id, name, startDate, endDate, budget, status]
})

// ---------------------------------------------------------------------------
// employee_projects (80) -- restricted to employees 1-55 and projects 1-25,
// so employees 56-60 and projects 26-30 are deliberately unassigned.
// ---------------------------------------------------------------------------
const ROLES_ON_PROJECT = ['Contributor', 'Lead', 'Reviewer', 'Consultant'] as const
const PROJECT_ASSIGNMENT_COUNTS = Array.from({ length: 25 }, (_, i) => (i === 24 ? 2 : [3, 3, 3, 4][i % 4]))

const employeeProjectSeedRows: (string | number | null)[][] = []
{
  let rowId = 1
  let offset = 0
  PROJECT_ASSIGNMENT_COUNTS.forEach((count, projectIdx) => {
    const projectId = projectIdx + 1
    for (let k = 0; k < count; k++) {
      const employeeId = 1 + ((offset + k) % 55)
      employeeProjectSeedRows.push([
        rowId,
        employeeId,
        projectId,
        pick(ROLES_ON_PROJECT, rowId),
        20 + ((employeeId * 7 + projectId * 3) % 120),
      ])
      rowId += 1
    }
    offset += count
  })
}

// ---------------------------------------------------------------------------
// attendance (90) -- employees 59-60 are recent hires with no records yet;
// employees 1-32 get 2 records each, 33-58 get 1 (32*2 + 26*1 = 90).
// ---------------------------------------------------------------------------
const ATTENDANCE_STATUSES = ['present', 'present', 'present', 'late', 'remote', 'absent'] as const

const attendanceSeedRows: (string | number | null)[][] = []
{
  let rowId = 1
  for (let employeeId = 1; employeeId <= 58; employeeId++) {
    const records = employeeId <= 32 ? 2 : 1
    for (let r = 0; r < records; r++) {
      const status = pick(ATTENDANCE_STATUSES, employeeId * 5 + r * 2)
      const date = addDays('2024-06-01', ((employeeId * 3 + r * 11) % 14))
      const worksToday = status !== 'absent'
      attendanceSeedRows.push([
        rowId,
        employeeId,
        date,
        status,
        worksToday ? '09:0' + String((employeeId + r) % 10) + ':00' : null,
        worksToday ? '17:3' + String((employeeId + r) % 10) + ':00' : null,
      ])
      rowId += 1
    }
  }
}

// ---------------------------------------------------------------------------

const seedTables: SeedTable[] = [
  { table: 'departments', columns: ['id', 'name', 'location', 'budget'], rows: departmentRows },
  { table: 'job_roles', columns: ['id', 'title', 'level', 'min_salary', 'max_salary'], rows: jobRoleRows },
  {
    table: 'employees',
    columns: [
      'id', 'first_name', 'last_name', 'email', 'department_id', 'job_role_id', 'manager_id',
      'hire_date', 'salary', 'status', 'termination_date',
    ],
    rows: employeeSeedRows,
  },
  {
    table: 'projects',
    columns: ['id', 'name', 'start_date', 'end_date', 'budget', 'status'],
    rows: projectSeedRows,
  },
  {
    table: 'employee_projects',
    columns: ['id', 'employee_id', 'project_id', 'role_on_project', 'hours_allocated'],
    rows: employeeProjectSeedRows,
  },
  {
    table: 'attendance',
    columns: ['id', 'employee_id', 'date', 'status', 'check_in', 'check_out'],
    rows: attendanceSeedRows,
  },
]

export const employeesPreset: SqlPresetDefinition = {
  id: 'preset-employees',
  name: 'Employee Management DB',
  shortName: 'Employee',
  description: 'Departments, employees, projects and attendance for an HR system.',
  version: 1,
  schemaSql,
  seedTables,
}
