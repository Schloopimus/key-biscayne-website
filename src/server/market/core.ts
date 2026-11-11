import { and, eq, gte, inArray, isNotNull } from 'drizzle-orm'
import { getDatabase } from '../db'
import * as schema from '../db/schema'
import type { MarketReservation, MarketVendor } from '../db/schema'
import {
  ACTIVE_STATUSES,
  fmtDay,
  marketToday,
  num,
  paymentDueAt,
  type AddonStock,
  type Prices,
} from '../../market/rules'

export type Db = ReturnType<typeof getDatabase>
// Drizzle's transaction handle shares the query API used here.
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type Q = Db | Tx

const SETTINGS_ID = 'market'
const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  weekly: '90',
  seasonal: '50',
  tent: '25',
  tableEach: '10',
  electricity: '5',
  stockTables: 6,
  stockElectricity: 11,
}

export function readSettings(q: Q): { prices: Prices; stock: AddonStock } {
  let row = q.select().from(schema.marketSettings).where(eq(schema.marketSettings.id, SETTINGS_ID)).get()
  if (!row) {
    q.insert(schema.marketSettings).values(DEFAULT_SETTINGS).onConflictDoNothing().run()
    row = DEFAULT_SETTINGS
  }
  return {
    prices: { weekly: row.weekly, seasonal: row.seasonal, tent: row.tent, table: row.tableEach, electricity: row.electricity },
    stock: { tables: row.stockTables, electricity: row.stockElectricity },
  }
}

export function adjustStock(q: Q, delta: { tables?: number; electricity?: number }) {
  const { stock } = readSettings(q)
  q.update(schema.marketSettings)
    .set({
      stockTables: Math.max(0, stock.tables + (delta.tables ?? 0)),
      stockElectricity: Math.max(0, stock.electricity + (delta.electricity ?? 0)),
    })
    .where(eq(schema.marketSettings.id, SETTINGS_ID))
    .run()
}

export const now = () => Date.now()
export const iso = () => new Date().toISOString()
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

export function audit(q: Q, actorKind: 'vendor' | 'admin' | 'system', actorId: string | null, action: string, entityId: string, summary: string) {
  q.insert(schema.auditLogs)
    .values({ id: newId('audit'), actorKind, actorId, action, entityType: 'market', entityId, summary, createdAt: iso() })
    .run()
}

export function setNotice(q: Q, vendorId: string, notice: string) {
  q.update(schema.marketVendors).set({ notice, updatedAt: iso() }).where(eq(schema.marketVendors.id, vendorId)).run()
}

// ---------- Availability ----------

const key = (date: string, stallId: number) => `${date}:${stallId}`

// Stalls that are booked or closed on the given Saturdays, optionally ignoring one reservation's own rows.
export function unavailableKeys(q: Q, dates: Array<string>, ignore?: { reservationId?: string; bookingId?: string }) {
  const out = new Set<string>()
  if (!dates.length) return out
  const rows = q
    .select({ id: schema.marketBookings.id, date: schema.marketBookings.marketDate, stallId: schema.marketBookings.stallId, reservationId: schema.marketBookings.reservationId })
    .from(schema.marketBookings)
    .where(and(inArray(schema.marketBookings.marketDate, dates), inArray(schema.marketBookings.status, ACTIVE_STATUSES)))
    .all()
  for (const row of rows) {
    if (ignore?.bookingId && row.id === ignore.bookingId) continue
    if (ignore?.reservationId && row.reservationId === ignore.reservationId) continue
    out.add(key(row.date, row.stallId))
  }
  const closures = q.select().from(schema.marketClosures).where(inArray(schema.marketClosures.marketDate, dates)).all()
  for (const c of closures) out.add(key(c.marketDate, c.stallId))
  return out
}

export const isTaken = (keys: Set<string>, date: string, stallId: number) => keys.has(key(date, stallId))

// ---------- Vendor standing ----------

export function approvalExpired(vendor: Pick<MarketVendor, 'status' | 'approvedUntil'>, at = now()) {
  return vendor.status === 'approved' && !!vendor.approvedUntil && vendor.approvedUntil < at
}

export function holdCount(q: Q, vendorId: string) {
  return q.select({ id: schema.marketHolds.id }).from(schema.marketHolds).where(eq(schema.marketHolds.vendorId, vendorId)).all().length
}

export function lateCancellations(q: Q, vendorId: string) {
  return q
    .select({ id: schema.marketCancellations.id })
    .from(schema.marketCancellations)
    .where(and(eq(schema.marketCancellations.vendorId, vendorId), eq(schema.marketCancellations.late, true)))
    .all().length
}

export function assertCanReserve(q: Q, vendor: MarketVendor) {
  if (vendor.status !== 'approved') throw new Error('Only approved vendors can reserve a space.')
  if (approvalExpired(vendor)) throw new Error('Your approval has expired. Please contact the market office to renew it before booking.')
  if (holdCount(q, vendor.id) > 0) throw new Error('Your account is on hold. Please contact the market office.')
  if (vendor.spaceLost) throw new Error('Your space was released after two cancellations without notice. Please contact the market office.')
}

export function currentReservation(q: Q, vendorId: string) {
  return (
    q
      .select()
      .from(schema.marketReservations)
      .where(and(eq(schema.marketReservations.vendorId, vendorId), eq(schema.marketReservations.current, true)))
      .get() ?? null
  )
}

export function reservationRows(q: Q, reservationId: string) {
  return q
    .select()
    .from(schema.marketBookings)
    .where(eq(schema.marketBookings.reservationId, reservationId))
    .all()
    .sort((a, b) => a.marketDate.localeCompare(b.marketDate) || a.createdAt.localeCompare(b.createdAt))
}

const activeIn = (rows: Array<{ status: string }>) => rows.some((r) => (ACTIVE_STATUSES as Array<string>).includes(r.status))

function returnAddons(q: Q, reservation: MarketReservation) {
  if (!reservation.addonsHeld) return
  adjustStock(q, { tables: reservation.tables, electricity: reservation.electricity ? 1 : 0 })
  q.update(schema.marketReservations).set({ addonsHeld: false }).where(eq(schema.marketReservations.id, reservation.id)).run()
}

// Holds the reservation's limited add-ons again. Returns false when they have sold out.
export function takeAddons(q: Q, reservation: MarketReservation) {
  if (reservation.addonsHeld) return true
  const { stock } = readSettings(q)
  if ((reservation.electricity && stock.electricity < 1) || reservation.tables > stock.tables) return false
  adjustStock(q, { tables: -reservation.tables, electricity: reservation.electricity ? -1 : 0 })
  q.update(schema.marketReservations).set({ addonsHeld: true }).where(eq(schema.marketReservations.id, reservation.id)).run()
  return true
}

export const SPACE_LOST_NOTICE =
  'Two Saturdays were cancelled without notice, so your space has been permanently released. Please contact the market office to request an exception.'

// After rows change: two late cancellations release the space; nothing active returns the add-ons.
export function settleReservation(q: Q, vendorId: string, reservationId: string, notice: string) {
  const reservation = q.select().from(schema.marketReservations).where(eq(schema.marketReservations.id, reservationId)).get()
  if (!reservation) return
  if (lateCancellations(q, vendorId) >= 2) {
    q.update(schema.marketBookings)
      .set({ status: 'released', updatedAt: iso() })
      .where(and(eq(schema.marketBookings.reservationId, reservationId), inArray(schema.marketBookings.status, ACTIVE_STATUSES)))
      .run()
    returnAddons(q, reservation)
    q.update(schema.marketReservations).set({ current: false }).where(eq(schema.marketReservations.id, reservationId)).run()
    q.update(schema.marketVendors).set({ spaceLost: true, notice: SPACE_LOST_NOTICE, updatedAt: iso() }).where(eq(schema.marketVendors.id, vendorId)).run()
    return
  }
  if (!activeIn(reservationRows(q, reservationId))) returnAddons(q, reservation)
  setNotice(q, vendorId, notice)
}

// Unpaid Saturdays are released once their Monday-midnight deadline passes.
export function sweepDeadlines(db: Db) {
  const at = now()
  const due = db
    .select({
      id: schema.marketBookings.id,
      date: schema.marketBookings.marketDate,
      reservationId: schema.marketBookings.reservationId,
      vendorId: schema.marketBookings.vendorId,
      dueSince: schema.marketBookings.updatedAt,
    })
    .from(schema.marketBookings)
    .where(and(eq(schema.marketBookings.status, 'due'), isNotNull(schema.marketBookings.reservationId), gte(schema.marketBookings.marketDate, marketToday(at))))
    .all()
    // A Saturday reserved after its deadline shows "Due now" and is not released automatically.
    .filter((row) => paymentDueAt(row.date) < at && Date.parse(row.dueSince) <= paymentDueAt(row.date))
  if (!due.length) return
  db.transaction((tx) => {
    for (const row of due) {
      tx.update(schema.marketBookings).set({ status: 'released', updatedAt: iso() }).where(eq(schema.marketBookings.id, row.id)).run()
      if (row.reservationId && row.vendorId) {
        settleReservation(
          tx,
          row.vendorId,
          row.reservationId,
          `${fmtDay(row.date)} wasn't paid by Monday midnight, so that space is available again. You can book another open space for that date below.`,
        )
      }
    }
  })
}

export function releaseRowForVendor(q: Q, bookingId: string, notice: string) {
  const row = q.select().from(schema.marketBookings).where(eq(schema.marketBookings.id, bookingId)).get()
  if (!row || !row.reservationId || !row.vendorId) return
  q.update(schema.marketBookings).set({ status: 'released', updatedAt: iso() }).where(eq(schema.marketBookings.id, bookingId)).run()
  settleReservation(q, row.vendorId, row.reservationId, notice)
}

export const toAmount = (value: unknown) => Math.round(num(value))
