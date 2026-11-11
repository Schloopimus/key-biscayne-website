import { createServerFn } from '@tanstack/react-start'
import { and, eq, gt, inArray } from 'drizzle-orm'
import { getDatabase } from './db'
import * as schema from './db/schema'
import { adminConfigured, endSession, ensureConfiguredAdmin, requireAdmin, startSession, verifyPassword } from './market/auth'
import {
  SPACE_LOST_NOTICE,
  adjustStock,
  approvalExpired,
  audit,
  iso,
  isTaken,
  lateCancellations,
  newId,
  now,
  readSettings,
  releaseRowForVendor,
  sweepDeadlines,
  toAmount,
  unavailableKeys,
} from './market/core'
import { isStallId, stallLabel } from '../market/plaza'
import {
  ACTIVE_STATUSES,
  addWeeks,
  endOfMarketDay,
  fmtDay,
  isMarketDate,
  isPlan,
  marketToday,
  num,
  tomorrow,
  upcomingSaturdays,
  type AckKey,
  type DocKind,
  type Plan,
} from '../market/rules'

// ---------- Sign in ----------

export const logInAdmin = createServerFn({ method: 'POST' })
  .validator((input: { email: string; password: string }) => ({
    email: String(input.email ?? '').trim().toLowerCase().slice(0, 320),
    password: String(input.password ?? '').slice(0, 200),
  }))
  .handler(async ({ data }) => {
    if (!adminConfigured()) throw new Error('No market admin account is set up yet. Set KBCC_ADMIN_EMAIL and KBCC_ADMIN_PASSWORD on the server.')
    const admin = ensureConfiguredAdmin(data.email)
    if (!admin || !verifyPassword(data.password, admin.passwordHash)) throw new Error('That email and password don’t match an admin account.')
    startSession('admin', admin.id)
    return { ok: true }
  })

export const logOutAdmin = createServerFn({ method: 'POST' }).handler(async () => {
  endSession('admin')
  return { ok: true }
})

// ---------- Dashboard data ----------

function parseAcks(json: string): Array<AckKey> {
  try {
    const value = JSON.parse(json) as unknown
    return Array.isArray(value) ? (value as Array<AckKey>) : []
  } catch {
    return []
  }
}

export const getAdminData = createServerFn({ method: 'GET' }).handler(async () => {
  requireAdmin()
  const database = getDatabase()
  sweepDeadlines(database)
  const today = marketToday()
  const first = upcomingSaturdays(1)[0]!
  const dates = Array.from({ length: 26 }, (_, i) => addWeeks(first, i))

  const docs = database.select().from(schema.marketDocuments).all()
  const holds = database.select().from(schema.marketHolds).all()
  const cancellations = database.select().from(schema.marketCancellations).all()
  const vendors = database
    .select()
    .from(schema.marketVendors)
    .all()
    .sort((a, b) => a.business.localeCompare(b.business))
    .map((v) => {
      const vendorDocs: Partial<Record<DocKind, string>> = {}
      const docLinks: Partial<Record<DocKind, string>> = {}
      for (const d of docs.filter((d) => d.vendorId === v.id)) {
        vendorDocs[d.kind] = d.fileName
        docLinks[d.kind] = `/api/documents/${d.id}`
      }
      return {
        id: v.id,
        business: v.business,
        contact: `${v.firstName} ${v.lastName}`.trim(),
        email: v.email,
        phone: v.phone,
        category: v.category,
        notes: v.notes,
        status: v.status,
        expired: approvalExpired(v),
        approvedUntil: v.approvedUntil,
        expiryReason: v.expiryReason,
        address: v.address,
        website: v.website,
        products: v.products,
        priceRange: v.priceRange,
        targetMarket: v.targetMarket,
        insuranceProvider: v.insuranceProvider,
        policyNumber: v.policyNumber,
        acksAccepted: v.status !== 'in_progress' && parseAcks(v.acksJson).length > 0,
        docs: vendorDocs,
        docLinks,
        holds: holds.filter((h) => h.vendorId === v.id).sort((a, b) => a.placedAt - b.placedAt).map((h) => ({ id: h.id, reason: h.reason, placedAt: h.placedAt })),
        cancellations: cancellations
          .filter((c) => c.vendorId === v.id)
          .sort((a, b) => a.cancelledAt - b.cancelledAt)
          .map((c) => ({ id: c.id, at: c.cancelledAt, late: c.late })),
      }
    })

  const bookings = database
    .select()
    .from(schema.marketBookings)
    .where(and(inArray(schema.marketBookings.status, ACTIVE_STATUSES), gt(schema.marketBookings.marketDate, addWeeks(today, -1))))
    .all()
    .sort((a, b) => a.marketDate.localeCompare(b.marketDate) || a.stallId - b.stallId)
    .map((b) => ({
      id: b.id,
      date: b.marketDate,
      stallId: b.stallId,
      vendorId: b.vendorId,
      walkIn: b.walkIn,
      plan: b.plan,
      amount: b.amount,
      tent: b.tent,
      tables: b.tables,
      electricity: b.electricity,
      payment: b.status as 'due' | 'confirming' | 'paid' | 'waived',
      note: b.note,
      source: b.source,
      online: !!b.reservationId,
    }))

  const closures = database.select().from(schema.marketClosures).where(inArray(schema.marketClosures.marketDate, dates)).all()
  const settings = readSettings(database)
  return { today, dates, vendors, bookings, closures: closures.map((c) => `${c.marketDate}:${c.stallId}`), ...settings }
})

export type AdminData = Awaited<ReturnType<typeof getAdminData>>

// ---------- Vendor standing ----------

const vendorIdInput = (input: { vendorId: string }) => ({ vendorId: String(input.vendorId ?? '').slice(0, 120) })

function findVendor(vendorId: string) {
  const vendor = getDatabase().select().from(schema.marketVendors).where(eq(schema.marketVendors.id, vendorId)).get()
  if (!vendor) throw new Error('This vendor no longer exists.')
  return vendor
}

export const approveVendor = createServerFn({ method: 'POST' })
  .validator((input: { vendorId: string; date: string; reason: string }) => ({
    vendorId: String(input.vendorId ?? '').slice(0, 120),
    date: String(input.date ?? ''),
    reason: String(input.reason ?? '').trim().slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('Choose an expiry date.')
    const until = endOfMarketDay(data.date)
    if (Number.isNaN(until)) throw new Error('Choose an expiry date.')
    if (until <= now() || data.date < tomorrow()) throw new Error('The expiry date must be in the future.')
    if (!data.reason) throw new Error('Add a reason for this expiry date.')
    const vendor = findVendor(data.vendorId)
    if (vendor.status === 'in_progress') throw new Error('This application has not been submitted yet.')
    const database = getDatabase()
    database
      .update(schema.marketVendors)
      .set({ status: 'approved', approvedUntil: until, expiryReason: data.reason, updatedAt: iso() })
      .where(eq(schema.marketVendors.id, vendor.id))
      .run()
    audit(database, 'admin', admin.id, 'vendor.approved', vendor.id, `Approved ${vendor.business} until ${data.date}.`)
    return { ok: true }
  })

export const rejectVendor = createServerFn({ method: 'POST' })
  .validator(vendorIdInput)
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    const vendor = findVendor(data.vendorId)
    if (vendor.status === 'in_progress') throw new Error('This application has not been submitted yet.')
    const database = getDatabase()
    database.update(schema.marketVendors).set({ status: 'rejected', updatedAt: iso() }).where(eq(schema.marketVendors.id, vendor.id)).run()
    audit(database, 'admin', admin.id, 'vendor.rejected', vendor.id, `Rejected ${vendor.business}.`)
    return { ok: true }
  })

export const placeHold = createServerFn({ method: 'POST' })
  .validator((input: { vendorId: string; reason: string }) => ({
    vendorId: String(input.vendorId ?? '').slice(0, 120),
    reason: String(input.reason ?? '').trim().slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    if (!data.reason) throw new Error('Add a reason for the hold.')
    const vendor = findVendor(data.vendorId)
    const database = getDatabase()
    database.insert(schema.marketHolds).values({ id: newId('hold'), vendorId: vendor.id, reason: data.reason, placedAt: now() }).run()
    audit(database, 'admin', admin.id, 'vendor.hold-placed', vendor.id, `Placed a hold on ${vendor.business}: ${data.reason}`)
    return { ok: true }
  })

export const releaseHold = createServerFn({ method: 'POST' })
  .validator((input: { holdId: string }) => ({ holdId: String(input.holdId ?? '').slice(0, 120) }))
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    const database = getDatabase()
    database.delete(schema.marketHolds).where(eq(schema.marketHolds.id, data.holdId)).run()
    audit(database, 'admin', admin.id, 'vendor.hold-released', data.holdId, 'Released a hold.')
    return { ok: true }
  })

// Removing a cancellation is a manual exception to the rules, and can restore a released space's standing.
export const removeCancellation = createServerFn({ method: 'POST' })
  .validator((input: { cancellationId: string }) => ({ cancellationId: String(input.cancellationId ?? '').slice(0, 120) }))
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    const database = getDatabase()
    const record = database.select().from(schema.marketCancellations).where(eq(schema.marketCancellations.id, data.cancellationId)).get()
    if (!record) return { ok: true }
    database.transaction((tx) => {
      tx.delete(schema.marketCancellations).where(eq(schema.marketCancellations.id, record.id)).run()
      const vendor = tx.select().from(schema.marketVendors).where(eq(schema.marketVendors.id, record.vendorId)).get()
      if (vendor?.spaceLost && lateCancellations(tx, vendor.id) < 2) {
        tx.update(schema.marketVendors)
          .set({ spaceLost: false, notice: vendor.notice === SPACE_LOST_NOTICE ? '' : vendor.notice, updatedAt: iso() })
          .where(eq(schema.marketVendors.id, vendor.id))
          .run()
      }
      audit(tx, 'admin', admin.id, 'vendor.cancellation-removed', record.vendorId, 'Removed a cancellation as an exception.')
    })
    return { ok: true }
  })

// ---------- Stalls and bookings ----------

export const setStallClosed = createServerFn({ method: 'POST' })
  .validator((input: { date: string; stallId: number; closed: boolean }) => {
    if (!isMarketDate(input.date) || !isStallId(Number(input.stallId))) throw new Error('Unknown stall.')
    return { date: input.date, stallId: Number(input.stallId), closed: !!input.closed }
  })
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    const database = getDatabase()
    if (data.closed) {
      const booked = unavailableKeys(database, [data.date])
      if (isTaken(booked, data.date, data.stallId)) throw new Error(`Stall ${stallLabel(data.stallId)} is booked on ${fmtDay(data.date)}.`)
      database.insert(schema.marketClosures).values({ marketDate: data.date, stallId: data.stallId }).onConflictDoNothing().run()
    } else {
      database
        .delete(schema.marketClosures)
        .where(and(eq(schema.marketClosures.marketDate, data.date), eq(schema.marketClosures.stallId, data.stallId)))
        .run()
    }
    audit(database, 'admin', admin.id, data.closed ? 'stall.closed' : 'stall.reopened', `${data.date}:${data.stallId}`, `${data.closed ? 'Closed' : 'Reopened'} stall ${stallLabel(data.stallId)} on ${fmtDay(data.date)}.`)
    return { ok: true }
  })

type EditorInput = {
  id: string | null
  date: string
  stallId: number
  vendorId: string
  walkIn: string
  plan: Plan
  amount: number
  tent: boolean
  tables: number
  electricity: boolean
  payment: 'due' | 'confirming' | 'paid' | 'waived'
  note: string
  repeat: boolean
}

export const saveBooking = createServerFn({ method: 'POST' })
  .validator((input: EditorInput) => {
    if (!isMarketDate(input.date)) throw new Error('Choose a market date.')
    if (!isStallId(Number(input.stallId))) throw new Error('Choose a stall.')
    if (!isPlan(input.plan)) throw new Error('Choose a plan.')
    if (!['due', 'confirming', 'paid', 'waived'].includes(input.payment)) throw new Error('Choose a payment status.')
    return {
      id: typeof input.id === 'string' && input.id ? input.id.slice(0, 120) : null,
      date: input.date,
      stallId: Number(input.stallId),
      vendorId: String(input.vendorId ?? '').slice(0, 120),
      walkIn: String(input.walkIn ?? '').trim().slice(0, 200),
      plan: input.plan,
      amount: toAmount(input.amount),
      tent: !!input.tent,
      tables: Math.floor(num(input.tables)),
      electricity: !!input.electricity,
      payment: input.payment,
      note: String(input.note ?? '').trim().slice(0, 500),
      repeat: !!input.repeat,
    }
  })
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    const database = getDatabase()
    if (!data.vendorId) throw new Error('Choose who this booking is for.')
    if (data.vendorId === 'walkin' && !data.walkIn) throw new Error('Enter a name for this manual booking.')
    if (data.vendorId !== 'walkin') findVendor(data.vendorId)

    database.transaction((tx) => {
      const original = data.id ? tx.select().from(schema.marketBookings).where(eq(schema.marketBookings.id, data.id)).get() : null
      if (data.id && (!original || !(ACTIVE_STATUSES as Array<string>).includes(original.status))) throw new Error('This booking no longer exists.')
      const online = !!original?.reservationId

      // A vendor's online Saturday keeps its price and add-ons; only the payment can change in place.
      if (original && online) {
        const unchanged = data.vendorId === original.vendorId && data.date === original.marketDate && data.stallId === original.stallId
        if (unchanged) {
          tx.update(schema.marketBookings)
            .set({ status: data.payment === 'waived' ? 'paid' : data.payment, note: data.note, updatedAt: iso() })
            .where(eq(schema.marketBookings.id, original.id))
            .run()
          audit(tx, 'admin', admin.id, 'booking.payment-updated', original.id, `Set ${fmtDay(original.marketDate)} stall ${stallLabel(original.stallId)} to ${data.payment}.`)
          return
        }
      }

      const repeat = !data.id && data.plan === 'seasonal' && data.repeat
      const dates = Array.from({ length: repeat ? 13 : 1 }, (_, i) => addWeeks(data.date, i))
      const taken = unavailableKeys(tx, dates, original ? { bookingId: original.id } : undefined)
      const clash = dates.find((d) => isTaken(taken, d, data.stallId))
      if (clash) throw new Error(`Stall ${stallLabel(data.stallId)} isn't available on ${fmtDay(clash)}. Choose another stall or date.`)

      // Limited add-ons: only the change from the saved booking counts against stock.
      const fields = online
        ? { amount: original!.amount, tent: original!.tent, tables: original!.tables, electricity: original!.electricity, plan: original!.plan }
        : { amount: data.amount, tent: data.tent, tables: data.tables, electricity: data.electricity, plan: data.plan }
      if (!online) {
        const { stock } = readSettings(tx)
        const needTables = (data.tables - (original?.tables ?? 0)) * dates.length
        const needElec = ((data.electricity ? 1 : 0) - (original?.electricity ? 1 : 0)) * dates.length
        if (needTables > stock.tables) throw new Error(`Only ${stock.tables} more tables are available.`)
        if (needElec > stock.electricity) throw new Error(`Only ${stock.electricity} more electricity hookups are available.`)
        adjustStock(tx, { tables: -needTables, electricity: -needElec })
      }

      const base = {
        stallId: data.stallId,
        vendorId: data.vendorId === 'walkin' ? null : data.vendorId,
        walkIn: data.vendorId === 'walkin' ? data.walkIn : '',
        ...fields,
        status: data.payment,
        note: data.note,
        updatedAt: iso(),
      }
      // The vendor's Saturday is released first so the new row can take the same stall and date.
      if (original && online) releaseRowForVendor(tx, original.id, `The market team changed your booking for ${fmtDay(original.marketDate)}.`)
      if (original && !online) {
        tx.update(schema.marketBookings).set({ ...base, marketDate: data.date }).where(eq(schema.marketBookings.id, original.id)).run()
      } else {
        const source = data.vendorId === 'walkin' || original?.source === 'Manual' ? 'Manual' : 'Admin'
        for (const date of dates) {
          tx.insert(schema.marketBookings).values({ ...base, id: newId('booking'), marketDate: date, reservationId: null, source, createdAt: iso() }).run()
        }
      }
      audit(tx, 'admin', admin.id, original ? 'booking.updated' : 'booking.created', original?.id ?? `${data.date}:${data.stallId}`, `${original ? 'Updated' : 'Created'} stall ${stallLabel(data.stallId)} on ${fmtDay(data.date)}.`)
    })
    return { date: data.date }
  })

export const deleteBooking = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => ({ id: String(input.id ?? '').slice(0, 120) }))
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    const database = getDatabase()
    database.transaction((tx) => {
      const row = tx.select().from(schema.marketBookings).where(eq(schema.marketBookings.id, data.id)).get()
      if (!row) return
      if (row.reservationId) {
        releaseRowForVendor(tx, row.id, `The market team removed your booking for ${fmtDay(row.marketDate)}.`)
      } else {
        adjustStock(tx, { tables: row.tables, electricity: row.electricity ? 1 : 0 })
        tx.delete(schema.marketBookings).where(eq(schema.marketBookings.id, row.id)).run()
      }
      audit(tx, 'admin', admin.id, 'booking.deleted', row.id, `Removed stall ${stallLabel(row.stallId)} on ${fmtDay(row.marketDate)}.`)
    })
    return { ok: true }
  })

// ---------- Pricing ----------

type SettingField = 'weekly' | 'seasonal' | 'tent' | 'table' | 'electricity' | 'stockTables' | 'stockElectricity'

export const saveSetting = createServerFn({ method: 'POST' })
  .validator((input: { field: SettingField; value: string }) => {
    const fields: Array<SettingField> = ['weekly', 'seasonal', 'tent', 'table', 'electricity', 'stockTables', 'stockElectricity']
    if (!fields.includes(input.field)) throw new Error('Unknown setting.')
    const raw = String(input.value ?? '').trim().slice(0, 12)
    if (raw !== '' && !(Number(raw) >= 0)) throw new Error('Enter a number of zero or more.')
    return { field: input.field, value: raw }
  })
  .handler(async ({ data }) => {
    const admin = requireAdmin()
    const database = getDatabase()
    readSettings(database)
    const column = {
      weekly: 'weekly',
      seasonal: 'seasonal',
      tent: 'tent',
      table: 'tableEach',
      electricity: 'electricity',
      stockTables: 'stockTables',
      stockElectricity: 'stockElectricity',
    } as const
    const isStock = data.field === 'stockTables' || data.field === 'stockElectricity'
    // Electricity alone may be blank, which shows "TBC" to vendors.
    const value = isStock ? Math.floor(num(data.value)) : data.field === 'electricity' ? data.value : String(num(data.value))
    database
      .update(schema.marketSettings)
      .set({ [column[data.field]]: value })
      .where(eq(schema.marketSettings.id, 'market'))
      .run()
    audit(database, 'admin', admin.id, 'settings.updated', data.field, `Set ${data.field} to ${value === '' ? 'TBC' : value}.`)
    return { ok: true }
  })
