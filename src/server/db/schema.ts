import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamp = (name: string) => text(name).notNull()

export const formSubmissions = sqliteTable(
  'form_submission',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['contact', 'volunteer', 'school'] }).notNull(),
    submitterName: text('submitter_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    topic: text('topic'),
    subject: text('subject'),
    message: text('message'),
    detailsJson: text('details_json').notNull().default('{}'),
    status: text('status', { enum: ['new', 'archived'] }).notNull().default('new'),
    createdAt: timestamp('created_at'),
  },
  (table) => [index('form_submission_type_created_idx').on(table.type, table.createdAt)],
)

export const vendors = sqliteTable(
  'vendor',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    contactName: text('contact_name').notNull(),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [uniqueIndex('vendor_email_unique').on(table.email)],
)

export const vendorApplications = sqliteTable(
  'vendor_application',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] })
      .notNull()
      .default('pending'),
    businessName: text('business_name').notNull(),
    productCategory: text('product_category').notNull(),
    contactName: text('contact_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    details: text('details').notNull(),
    certificateFileName: text('certificate_file_name').notNull(),
    certificateStoredName: text('certificate_stored_name').notNull(),
    certificateMime: text('certificate_mime').notNull(),
    certificateSize: integer('certificate_size').notNull(),
    rejectionReason: text('rejection_reason'),
    submittedAt: timestamp('submitted_at'),
    reviewedAt: text('reviewed_at'),
  },
  (table) => [
    uniqueIndex('vendor_application_revision_unique').on(table.vendorId, table.revision),
    index('vendor_application_status_idx').on(table.status, table.submittedAt),
  ],
)

export const marketEvents = sqliteTable(
  'market_event',
  {
    id: text('id').primaryKey(),
    marketDate: text('market_date').notNull(),
    label: text('label').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
    createdAt: timestamp('created_at'),
  },
  (table) => [uniqueIndex('market_event_date_unique').on(table.marketDate)],
)

export const stalls = sqliteTable(
  'stall',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    description: text('description').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [uniqueIndex('stall_code_unique').on(table.code)],
)

export const eventStalls = sqliteTable(
  'event_stall',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => marketEvents.id, { onDelete: 'cascade' }),
    stallId: text('stall_id')
      .notNull()
      .references(() => stalls.id, { onDelete: 'cascade' }),
    tier: text('tier', { enum: ['standard', 'corner', 'premium'] })
      .notNull()
      .default('standard'),
    priceCents: integer('price_cents').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [
    uniqueIndex('event_stall_unique').on(table.eventId, table.stallId),
    index('event_stall_event_idx').on(table.eventId),
  ],
)

export const bookings = sqliteTable(
  'booking',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    eventStallId: text('event_stall_id')
      .notNull()
      .references(() => eventStalls.id, { onDelete: 'restrict' }),
    status: text('status', { enum: ['reserved', 'cancelled'] }).notNull().default('reserved'),
    priceCents: integer('price_cents').notNull(),
    reservedAt: timestamp('reserved_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    uniqueIndex('booking_active_stall_unique')
      .on(table.eventStallId)
      .where(sql`${table.status} = 'reserved'`),
    index('booking_vendor_idx').on(table.vendorId, table.status),
  ],
)

export const auditLogs = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actorKind: text('actor_kind', { enum: ['local-vendor', 'local-admin', 'system'] }).notNull(),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at'),
  },
  (table) => [index('audit_log_created_idx').on(table.createdAt)],
)

export type FormSubmission = typeof formSubmissions.$inferSelect
export type Vendor = typeof vendors.$inferSelect
export type VendorApplication = typeof vendorApplications.$inferSelect
export type MarketEvent = typeof marketEvents.$inferSelect
export type Stall = typeof stalls.$inferSelect
export type EventStall = typeof eventStalls.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
