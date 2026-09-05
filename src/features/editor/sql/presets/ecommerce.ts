import { addDays, pick } from './genUtils'
import type { SeedTable, SqlPresetDefinition } from './types'

const schemaSql = `
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price REAL NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'USA',
  signup_date TEXT NOT NULL,
  loyalty_points INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  order_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  shipping_city TEXT,
  notes TEXT
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  amount REAL NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('credit_card','paypal','bank_transfer','cash_on_delivery')),
  status TEXT NOT NULL CHECK (status IN ('paid','refunded','failed','pending')),
  paid_at TEXT
);
`.trim()

// ---------------------------------------------------------------------------
// categories (10)
// ---------------------------------------------------------------------------
const CATEGORY_NAMES = [
  ['Electronics', 'Phones, audio, computing accessories'],
  ['Books', 'Fiction, non-fiction and technical titles'],
  ['Home & Kitchen', 'Cookware, small appliances and decor'],
  ['Sports & Outdoors', 'Fitness gear and outdoor equipment'],
  ['Toys & Games', 'Toys, puzzles and board games'],
  ['Clothing', 'Everyday and seasonal apparel'],
  ['Beauty & Personal Care', 'Skincare, haircare and grooming'],
  ['Grocery', 'Pantry staples and snacks'],
  ['Office Supplies', 'Desk gear and stationery'],
  ['Automotive', 'Car accessories and maintenance'],
] as const

const categoryRows = CATEGORY_NAMES.map(([name, description], i) => [i + 1, name, description])

// ---------------------------------------------------------------------------
// products (60) -- curated per-category name pools (58) + 2 uncategorized
// ---------------------------------------------------------------------------
const CATEGORY_PRODUCT_POOLS: string[][] = [
  [
    'Wireless Earbuds Pro',
    'Bluetooth Speaker Mini',
    '27-inch 4K Monitor',
    'Mechanical Keyboard RGB',
    'USB-C 7-in-1 Hub',
    'Smartwatch Series 3',
    'Portable SSD 1TB',
  ],
  [
    'The Silent Ocean (Novel)',
    'Mystery at Dawn',
    'Learning SQL the Hard Way',
    'Atomic Focus: A Habits Guide',
    'The Home Chef Cookbook',
    'A Short History of Rome',
  ],
  [
    'Stainless Steel Cookware Set',
    'Non-Stick Frying Pan',
    'Electric Kettle 1.7L',
    'Ceramic Dinner Set (16pc)',
    'Memory Foam Pillow',
    'LED Desk Lamp',
  ],
  [
    'Yoga Mat Premium',
    'Adjustable Dumbbell Set',
    'Camping Tent (4-Person)',
    'Insulated Water Bottle 1L',
    'Trail Running Shoes',
    'Foldable Camping Chair',
  ],
  [
    'Building Blocks 500pc',
    'Remote Control Car',
    '1000-Piece Puzzle',
    'Board Game: Strategy Quest',
    'Plush Bear Large',
    'Kids Art Easel',
  ],
  [
    'Cotton T-Shirt (Unisex)',
    'Denim Jacket',
    'Running Shorts',
    'Wool Winter Coat',
    'Slim Fit Chinos',
    'Waterproof Rain Jacket',
  ],
  [
    'Vitamin C Serum',
    'Electric Toothbrush',
    'Ionic Hair Dryer',
    'Moisturizing Body Lotion',
    'Beard Trimmer Kit',
    'Facial Cleansing Brush',
  ],
  [
    'Organic Olive Oil 1L',
    'Almond Butter Jar',
    'Dark Roast Coffee Beans 1kg',
    'Assorted Herbal Tea Box',
    'Whole Wheat Pasta 500g',
  ],
  [
    'Ergonomic Office Chair',
    'Standing Desk Converter',
    'Silent Wireless Mouse',
    'A4 Notebook Pack (5)',
    'Permanent Marker Set',
  ],
  [
    'Car Phone Mount',
    'Microfiber Cleaning Cloth Set',
    'Digital Tire Pressure Gauge',
    'Dash Cam 1080p',
    'LED Headlight Bulb Kit',
  ],
]

const UNCATEGORIZED_PRODUCTS = ['Mystery Grab Bag Item', 'Clearance Warehouse Find']

const PRICE_BANDS = [
  9.99, 12.99, 14.99, 19.99, 24.99, 29.99, 34.99, 39.99, 49.99, 59.99, 69.99, 79.99, 89.99, 99.99,
  129.99, 149.99, 199.99, 249.99, 299.99, 899.0,
]
const STOCK_BANDS = [0, 3, 5, 8, 12, 15, 20, 25, 30, 40, 50, 60, 75, 90, 100, 120, 150, 200, 250, 300]
const INACTIVE_PRODUCT_INDEXES = new Set([11, 44]) // discontinued items -- filtering practice

interface ProductRow {
  id: number
  categoryId: number | null
  name: string
  price: number
}

const productRows: ProductRow[] = []
{
  let productId = 1
  CATEGORY_PRODUCT_POOLS.forEach((pool, categoryIdx) => {
    pool.forEach((name) => {
      productRows.push({
        id: productId,
        categoryId: categoryIdx + 1,
        name,
        price: pick(PRICE_BANDS, productId * 3),
      })
      productId += 1
    })
  })
  UNCATEGORIZED_PRODUCTS.forEach((name) => {
    productRows.push({ id: productId, categoryId: null, name, price: pick(PRICE_BANDS, productId * 3) })
    productId += 1
  })
}

const productSeedRows = productRows.map((p, i) => [
  p.id,
  p.categoryId,
  p.name,
  `SKU-${String(p.id).padStart(5, '0')}`,
  p.price,
  pick(STOCK_BANDS, i * 7),
  INACTIVE_PRODUCT_INDEXES.has(i) ? 0 : 1,
  addDays('2023-01-05', (i * 11) % 700),
])

const productPriceById = new Map(productRows.map((p) => [p.id, p.price]))

// ---------------------------------------------------------------------------
// customers (50)
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas',
  'Mia', 'Aiden', 'Amelia', 'Elijah', 'Harper', 'James', 'Evelyn', 'Benjamin', 'Abigail', 'Henry',
  'Ella', 'Alexander', 'Scarlett', 'Michael', 'Grace', 'Daniel', 'Chloe', 'Matthew', 'Victoria', 'Jackson',
  'Riley', 'Sebastian', 'Aria', 'David', 'Lily', 'Joseph', 'Zoey', 'Carter', 'Hannah', 'Owen',
  'Layla', 'Wyatt', 'Nora', 'John', 'Addison', 'Luke', 'Aubrey', 'Jack', 'Ellie', 'Dylan',
]
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
]
const CITIES = [
  ['Austin', 'USA'], ['Seattle', 'USA'], ['Chicago', 'USA'], ['Denver', 'USA'], ['Miami', 'USA'],
  ['Toronto', 'Canada'], ['Vancouver', 'Canada'], ['London', 'UK'], ['Manchester', 'UK'],
  ['Sydney', 'Australia'], ['Mumbai', 'India'], ['Bengaluru', 'India'],
]
const CUSTOMER_COUNT = 50
const NO_CITY_INDEXES = new Set([4, 21, 38]) // city unknown -- NULL handling practice
const NO_PHONE_INDEXES = new Set([2, 9, 17, 26, 33, 41])

const customerSeedRows = Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
  const id = i + 1
  const firstName = pick(FIRST_NAMES, i)
  const lastName = pick(LAST_NAMES, i * 3 + 1)
  const [city, country] = pick(CITIES, i)
  return [
    id,
    firstName,
    lastName,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@example.com`,
    NO_PHONE_INDEXES.has(i) ? null : `+1-555-${String(1000 + i * 7).padStart(4, '0')}`,
    NO_CITY_INDEXES.has(i) ? null : city,
    country,
    addDays('2021-03-01', i * 17),
    (i * 137) % 5000,
  ]
})

// ---------------------------------------------------------------------------
// orders (80) -- 32 "active" customers place orders (varied 1-4 each, summing
// to 80); the other 18 customers deliberately have zero orders (LEFT/RIGHT
// JOIN + NOT EXISTS practice).
// ---------------------------------------------------------------------------
const ACTIVE_ORDER_CUSTOMERS = 32
const ORDER_COUNT_CYCLE = [1, 2, 3, 4]
const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'delivered', 'cancelled'] as const

interface OrderRow {
  id: number
  customerId: number
  status: (typeof STATUSES)[number]
}

const orderRows: OrderRow[] = []
{
  let orderId = 1
  for (let c = 0; c < ACTIVE_ORDER_CUSTOMERS; c++) {
    const count = pick(ORDER_COUNT_CYCLE, c)
    for (let k = 0; k < count; k++) {
      orderRows.push({ id: orderId, customerId: c + 1, status: pick(STATUSES, orderId) })
      orderId += 1
    }
  }
  // Force the final 3 orders to 'cancelled' with zero line items (see order_items below).
  for (const row of orderRows.slice(-3)) row.status = 'cancelled'
}

const customerCityById = new Map(
  customerSeedRows.map((row) => [row[0] as number, row[5] as string | null]),
)

const orderSeedRows = orderRows.map((o) => [
  o.id,
  o.customerId,
  addDays('2023-02-01', o.id * 4),
  o.status,
  customerCityById.get(o.customerId) ?? null,
  o.id % 10 === 0 ? 'Gift order -- include a gift receipt.' : null,
])

// ---------------------------------------------------------------------------
// order_items (90) -- the last 3 orders (forced 'cancelled') get none; the
// remaining 77 orders get 1 item each, plus 13 of them get a 2nd item.
// Restricted to products 1-45 so products 46-60 are deliberately never ordered.
// ---------------------------------------------------------------------------
const ordersWithItems = orderRows.slice(0, -3)
const orderItemSeedRows: (string | number | null)[][] = []
{
  let itemId = 1
  ordersWithItems.forEach((order, idx) => {
    const itemCount = idx % 6 === 0 ? 2 : 1
    for (let k = 0; k < itemCount; k++) {
      const productId = 1 + ((order.id * 7 + k * 3) % 45)
      const quantity = 1 + ((order.id + k) % 5)
      orderItemSeedRows.push([itemId, order.id, productId, quantity, productPriceById.get(productId) ?? 0])
      itemId += 1
    }
  })
}

// ---------------------------------------------------------------------------
// payments (80) -- 'pending' orders have no payment yet; 'cancelled' orders
// either have none or a 'refunded' row; fulfilled orders get one 'paid' row,
// and a handful get an extra 'failed' attempt before the successful one, so
// the total still lands on 80 despite pending/cancelled orders having zero.
// ---------------------------------------------------------------------------
const PAYMENT_METHODS = ['credit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'] as const
const TARGET_PAYMENT_ROWS = 80

const paymentSeedRows: (string | number | null)[][] = []
{
  let paymentId = 1
  const eligibleOrders: OrderRow[] = []
  orderRows.forEach((order) => {
    const method = pick(PAYMENT_METHODS, order.id)
    const paidAt = addDays('2023-02-02', order.id * 4)
    if (order.status === 'pending') return
    if (order.status === 'cancelled') {
      if (order.id % 2 === 1) {
        paymentSeedRows.push([paymentId, order.id, 0, method, 'refunded', paidAt])
        paymentId += 1
      }
      return
    }
    eligibleOrders.push(order)
    paymentSeedRows.push([paymentId, order.id, 0, method, 'paid', paidAt])
    paymentId += 1
  })
  // Pad up to the target row count with realistic "failed attempt before the
  // successful charge" retries on already-fulfilled orders -- keeps the total
  // stable even if the pending/cancelled/fulfilled split above shifts.
  const extraNeeded = Math.max(0, TARGET_PAYMENT_ROWS - paymentSeedRows.length)
  for (let i = 0; i < extraNeeded; i++) {
    const order = eligibleOrders[i % eligibleOrders.length]
    const method = pick(PAYMENT_METHODS, order.id + 1)
    const paidAt = addDays('2023-02-02', order.id * 4 - 1)
    paymentSeedRows.push([paymentId, order.id, 0, method, 'failed', paidAt])
    paymentId += 1
  }
}

// Backfill payment amounts from the order's actual line-item total (falls back
// to a flat placeholder for the rare order with no items).
const orderTotalById = new Map<number, number>()
for (const [, orderId, , quantity, unitPrice] of orderItemSeedRows) {
  const key = orderId as number
  orderTotalById.set(key, (orderTotalById.get(key) ?? 0) + (quantity as number) * (unitPrice as number))
}
for (const row of paymentSeedRows) {
  const orderId = row[1] as number
  row[2] = Math.round((orderTotalById.get(orderId) ?? 49.99) * 100) / 100
}

// ---------------------------------------------------------------------------

const seedTables: SeedTable[] = [
  { table: 'categories', columns: ['id', 'name', 'description'], rows: categoryRows },
  {
    table: 'products',
    columns: ['id', 'category_id', 'name', 'sku', 'price', 'stock_quantity', 'is_active', 'created_at'],
    rows: productSeedRows,
  },
  {
    table: 'customers',
    columns: [
      'id', 'first_name', 'last_name', 'email', 'phone', 'city', 'country', 'signup_date', 'loyalty_points',
    ],
    rows: customerSeedRows,
  },
  {
    table: 'orders',
    columns: ['id', 'customer_id', 'order_date', 'status', 'shipping_city', 'notes'],
    rows: orderSeedRows,
  },
  {
    table: 'order_items',
    columns: ['id', 'order_id', 'product_id', 'quantity', 'unit_price'],
    rows: orderItemSeedRows,
  },
  {
    table: 'payments',
    columns: ['id', 'order_id', 'amount', 'method', 'status', 'paid_at'],
    rows: paymentSeedRows,
  },
]

export const ecommercePreset: SqlPresetDefinition = {
  id: 'preset-ecommerce',
  name: 'E-commerce DB',
  shortName: 'Ecommerce',
  description: 'Customers, orders, products and payments for a small online store.',
  version: 1,
  schemaSql,
  seedTables,
}
