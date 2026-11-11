import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamp = (name: string) => text(name).notNull()

const flag = (name: string) => integer(name, { mode: 'boolean' }).notNull().default(false)

// One row per vendor account. The account, its application and its market standing live together
// because the design treats them as one record: sign-up details, application progress, approval.
export const marketVendors = sqliteTable(
  'market_vendor',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    business: text('business').notNull(),
    phone: text('phone').notNull(),
    category: text('category').notNull(),
    notes: text('notes').notNull().default(''),
    status: text('status', { enum: ['in_progress', 'pending', 'approved', 'rejected'] })
      .notNull()
      .default('in_progress'),
    detailsDone: flag('details_done'),
    documentsDone: flag('documents_done'),
    address: text('address').notNull().default(''),
    website: text('website').notNull().default(''),
    products: text('products').notNull().default(''),
    priceRange: text('price_range').notNull().default(''),
    targetMarket: text('target_market').notNull().default(''),
    insuranceProvider: text('insurance_provider').notNull().default(''),
    policyNumber: text('policy_number').notNull().default(''),
    acksJson: text('acks_json').notNull().default('[]'),
    approvedUntil: integer('approved_until'),
    expiryReason: text('expiry_reason').notNull().default(''),
    spaceLost: flag('space_lost'),
    notice: text('notice').notNull().default(''),
    submittedAt: text('submitted_at'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [uniqueIndex('market_vendor_email_unique').on(table.email)],
)

export const marketDocuments = sqliteTable(
  'market_document',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => marketVendors.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['photoId', 'insurance', 'photos', 'foodPermit', 'mobilePermit'] }).notNull(),
    fileName: text('file_name').notNull(),
    storedName: text('stored_name').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    uploadedAt: timestamp('uploaded_at'),
  },
  (table) => [uniqueIndex('market_document_kind_unique').on(table.vendorId, table.kind)],
)

export const marketAdmins = sqliteTable(
  'market_admin',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at'),
  },
  (table) => [uniqueIndex('market_admin_email_unique').on(table.email)],
)

export const marketSessions = sqliteTable(
  'market_session',
  {
    tokenHash: text('token_hash').primaryKey(),
    kind: text('kind', { enum: ['vendor', 'admin'] }).notNull(),
    subjectId: text('subject_id').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: timestamp('created_at'),
  },
  (table) => [index('market_session_subject_idx').on(table.kind, table.subjectId)],
)

// Single-use links that would be emailed: set a password after sign-up, or change it later.
export const marketTokens = sqliteTable('market_token', {
  tokenHash: text('token_hash').primaryKey(),
  vendorId: text('vendor_id')
    .notNull()
    .references(() => marketVendors.id, { onDelete: 'cascade' }),
  purpose: text('purpose', { enum: ['set_password', 'reset_password'] }).notNull(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
  createdAt: timestamp('created_at'),
})

// A vendor's plan, price and add-ons. Each Saturday it covers is a market_booking row.
export const marketReservations = sqliteTable(
  'market_reservation',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => marketVendors.id, { onDelete: 'cascade' }),
    plan: text('plan', { enum: ['weekly', 'seasonal'] }).notNull(),
    stallId: integer('stall_id').notNull(),
    perSaturday: integer('per_saturday').notNull(),
    tent: flag('tent'),
    tables: integer('tables').notNull().default(0),
    electricity: flag('electricity'),
    otherExtras: text('other_extras').notNull().default(''),
    addonsHeld: flag('addons_held'),
    current: flag('current'),
    createdAt: timestamp('created_at'),
  },
  (table) => [index('market_reservation_vendor_idx').on(table.vendorId, table.current)],
)

// One stall on one Saturday. Online rows belong to a reservation; admin and manual rows do not.
export const marketBookings = sqliteTable(
  'market_booking',
  {
    id: text('id').primaryKey(),
    marketDate: text('market_date').notNull(),
    stallId: integer('stall_id').notNull(),
    reservationId: text('reservation_id').references(() => marketReservations.id, { onDelete: 'cascade' }),
    vendorId: text('vendor_id').references(() => marketVendors.id, { onDelete: 'cascade' }),
    walkIn: text('walk_in').notNull().default(''),
    plan: text('plan', { enum: ['weekly', 'seasonal'] }).notNull(),
    amount: integer('amount').notNull(),
    tent: flag('tent'),
    tables: integer('tables').notNull().default(0),
    electricity: flag('electricity'),
    status: text('status', { enum: ['due', 'confirming', 'paid', 'waived', 'cancelled', 'released'] })
      .notNull()
      .default('due'),
    note: text('note').notNull().default(''),
    source: text('source', { enum: ['Online', 'Admin', 'Manual'] }).notNull(),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    uniqueIndex('market_booking_active_unique')
      .on(table.marketDate, table.stallId)
      .where(sql`${table.status} in ('due', 'confirming', 'paid', 'waived')`),
    index('market_booking_vendor_idx').on(table.vendorId, table.marketDate),
    index('market_booking_reservation_idx').on(table.reservationId),
  ],
)

export const marketCancellations = sqliteTable('market_cancellation', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id')
    .notNull()
    .references(() => marketVendors.id, { onDelete: 'cascade' }),
  cancelledAt: integer('cancelled_at').notNull(),
  late: flag('late'),
})

export const marketHolds = sqliteTable('market_hold', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id')
    .notNull()
    .references(() => marketVendors.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  placedAt: integer('placed_at').notNull(),
})

export const marketClosures = sqliteTable(
  'market_closure',
  {
    marketDate: text('market_date').notNull(),
    stallId: integer('stall_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.marketDate, table.stallId] })],
)

// Prices and limited add-on stock. One row, id 'market'.
export const marketSettings = sqliteTable('market_settings', {
  id: text('id').primaryKey(),
  weekly: text('weekly').notNull(),
  seasonal: text('seasonal').notNull(),
  tent: text('tent').notNull(),
  tableEach: text('table_each').notNull(),
  electricity: text('electricity').notNull(),
  stockTables: integer('stock_tables').notNull(),
  stockElectricity: integer('stock_electricity').notNull(),
})


export const auditLogs = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actorKind: text('actor_kind', { enum: ['vendor', 'admin', 'system'] }).notNull(),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at'),
  },
  (table) => [index('audit_log_created_idx').on(table.createdAt)],
)

export type AuditLog = typeof auditLogs.$inferSelect
export type MarketVendor = typeof marketVendors.$inferSelect
export type MarketDocument = typeof marketDocuments.$inferSelect
export type MarketReservation = typeof marketReservations.$inferSelect
export type MarketBooking = typeof marketBookings.$inferSelect
export type MarketSettings = typeof marketSettings.$inferSelect
