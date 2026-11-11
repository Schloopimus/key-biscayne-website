import { createServerFn } from '@tanstack/react-start'
import { and, eq, gt, inArray, isNull } from 'drizzle-orm'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { getDataDirectory, getDatabase } from './db'
import * as schema from './db/schema'
import type { MarketVendor } from './db/schema'
import {
  currentVendor,
  endAllSessions,
  endSession,
  hashPassword,
  hashToken,
  newToken,
  requireVendor,
  startSession,
  verifyPassword,
} from './market/auth'
import {
  adjustStock,
  approvalExpired,
  assertCanReserve,
  audit,
  currentReservation,
  holdCount,
  iso,
  isTaken,
  lateCancellations,
  newId,
  now,
  readSettings,
  reservationRows,
  setNotice,
  settleReservation,
  sweepDeadlines,
  takeAddons,
  unavailableKeys,
} from './market/core'
import { sendMarketEmail } from './market/email'
import { isStallId, stallLabel } from '../market/plaza'
import {
  ACTIVE_STATUSES,
  ALL_CATEGORIES,
  DOC_KINDS,
  PLANS,
  PRICE_RANGES,
  ackKeys,
  addWeeks,
  fmtDay,
  isActiveStatus,
  isLate,
  isMarketDate,
  isPlan,
  quote,
  saturdayOpensAt,
  stepErrors,
  upcomingSaturdays,
  type AckKey,
  type Addons,
  type DayStatus,
  type DocKind,
  type Plan,
} from '../market/rules'

// ---------- Input helpers ----------

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const DAY_MS = 24 * 60 * 60 * 1000

function issueToken(vendorId: string, purpose: 'set_password' | 'reset_password') {
  const token = newToken()
  getDatabase()
    .insert(schema.marketTokens)
    .values({ tokenHash: hashToken(token), vendorId, purpose, expiresAt: now() + DAY_MS, usedAt: null, createdAt: iso() })
    .run()
  return `/set-password?token=${token}`
}

// ---------- Sign-up, password and login ----------

export const signUpVendor = createServerFn({ method: 'POST' })
  .validator((input: Record<string, unknown>) => {
    const fields = {
      firstName: typeof input.firstName === 'string' ? input.firstName.trim() : '',
      lastName: typeof input.lastName === 'string' ? input.lastName.trim() : '',
      business: typeof input.business === 'string' ? input.business.trim() : '',
      email: typeof input.email === 'string' ? input.email.trim().toLowerCase() : '',
      phone: typeof input.phone === 'string' ? input.phone.trim() : '',
      category: typeof input.category === 'string' ? input.category : '',
      notes: typeof input.notes === 'string' ? input.notes.trim().slice(0, 1000) : '',
    }
    const missing = (
      [
        ['firstName', 'first name'],
        ['lastName', 'last name'],
        ['business', 'business or farm name'],
        ['email', 'email'],
        ['phone', 'telephone'],
        ['category', 'category'],
      ] as const
    )
      .filter(([k]) => !fields[k])
      .map(([, label]) => label)
    if (missing.length) throw new Error(`Please add your ${missing.join(', ')}.`)
    if (!validEmail(fields.email)) throw new Error('Please enter a valid email address.')
    if (!ALL_CATEGORIES.includes(fields.category)) throw new Error('Please add your category.')
    for (const k of ['firstName', 'lastName', 'business', 'phone'] as const) {
      if (fields[k].length > 200) throw new Error('One of your answers is too long.')
    }
    return fields
  })
  .handler(async ({ data }) => {
    const database = getDatabase()
    const existing = database.select({ id: schema.marketVendors.id }).from(schema.marketVendors).where(eq(schema.marketVendors.email, data.email)).get()
    if (existing) throw new Error('An account already uses this email. Log in instead.')
    const id = newId('vendor')
    database
      .insert(schema.marketVendors)
      .values({ id, ...data, status: 'in_progress', createdAt: iso(), updatedAt: iso() })
      .run()
    audit(database, 'vendor', id, 'vendor.signed-up', id, `${data.business} joined the market.`)
    const link = issueToken(id, 'set_password')
    const delivery = sendMarketEmail({ to: data.email, subject: 'Set your Farmers Market password', link })
    return { email: data.email, link: delivery.delivered ? null : link }
  })

export const readPasswordToken = createServerFn({ method: 'GET' })
  .validator((input: { token: string }) => ({ token: typeof input.token === 'string' ? input.token.slice(0, 200) : '' }))
  .handler(async ({ data }) => {
    const database = getDatabase()
    const token = database
      .select()
      .from(schema.marketTokens)
      .where(and(eq(schema.marketTokens.tokenHash, hashToken(data.token)), isNull(schema.marketTokens.usedAt), gt(schema.marketTokens.expiresAt, now())))
      .get()
    if (!token) return { valid: false as const, firstName: '' }
    const vendor = database.select({ firstName: schema.marketVendors.firstName }).from(schema.marketVendors).where(eq(schema.marketVendors.id, token.vendorId)).get()
    return { valid: !!vendor, firstName: vendor?.firstName ?? '' }
  })

export const setVendorPassword = createServerFn({ method: 'POST' })
  .validator((input: { token: string; password: string; confirm: string }) => {
    if (typeof input.password !== 'string' || input.password.length < 8) throw new Error('Use at least 8 characters.')
    if (input.password !== input.confirm) throw new Error("The passwords don't match.")
    if (input.password.length > 200) throw new Error('Use a shorter password.')
    return { token: String(input.token ?? '').slice(0, 200), password: input.password }
  })
  .handler(async ({ data }) => {
    const database = getDatabase()
    const token = database
      .select()
      .from(schema.marketTokens)
      .where(and(eq(schema.marketTokens.tokenHash, hashToken(data.token)), isNull(schema.marketTokens.usedAt), gt(schema.marketTokens.expiresAt, now())))
      .get()
    if (!token) throw new Error('This link has expired. Ask for a new one from the login page.')
    const firstTime = token.purpose === 'set_password'
    database.transaction((tx) => {
      tx.update(schema.marketTokens).set({ usedAt: now() }).where(eq(schema.marketTokens.tokenHash, token.tokenHash)).run()
      tx.update(schema.marketVendors)
        .set({
          passwordHash: hashPassword(data.password),
          updatedAt: iso(),
          ...(firstTime ? { notice: 'Welcome! Finish your application to start booking.' } : {}),
        })
        .where(eq(schema.marketVendors.id, token.vendorId))
        .run()
    })
    endAllSessions('vendor', token.vendorId)
    startSession('vendor', token.vendorId)
    return { ok: true }
  })

export const logInVendor = createServerFn({ method: 'POST' })
  .validator((input: { email: string; password: string }) => ({
    email: String(input.email ?? '').trim().toLowerCase().slice(0, 320),
    password: String(input.password ?? '').slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const vendor = getDatabase().select().from(schema.marketVendors).where(eq(schema.marketVendors.email, data.email)).get()
    if (!vendor || !verifyPassword(data.password, vendor.passwordHash)) throw new Error('That email and password don’t match a vendor account.')
    startSession('vendor', vendor.id)
    return { ok: true }
  })

export const logOutVendor = createServerFn({ method: 'POST' }).handler(async () => {
  endSession('vendor')
  return { ok: true }
})

// ---------- Session summary for the header and public page ----------

export const getVendorSession = createServerFn({ method: 'GET' }).handler(async () => {
  const vendor = currentVendor()
  if (!vendor) return null
  return { name: `${vendor.firstName} ${vendor.lastName}`.trim(), email: vendor.email }
})

export const getPublicMarket = createServerFn({ method: 'GET' }).handler(async () => {
  const { prices } = readSettings(getDatabase())
  const vendor = currentVendor()
  return {
    prices,
    session: vendor ? { name: `${vendor.firstName} ${vendor.lastName}`.trim(), email: vendor.email } : null,
  }
})

// ---------- Vendor dashboard ----------

export type DashboardRow = { id: string; date: string; stallId: number; status: DayStatus }

function documentNames(vendorId: string) {
  const docs = getDatabase().select().from(schema.marketDocuments).where(eq(schema.marketDocuments.vendorId, vendorId)).all()
  const out: Partial<Record<DocKind, string>> = {}
  for (const doc of docs) out[doc.kind] = doc.fileName
  return out
}

function parseAcks(json: string): Array<AckKey> {
  try {
    const value = JSON.parse(json) as unknown
    return Array.isArray(value) ? (value.filter((k) => ['setup', 'conduct', 'liability', 'food'].includes(k)) as Array<AckKey>) : []
  } catch {
    return []
  }
}

function profile(vendor: MarketVendor) {
  return {
    firstName: vendor.firstName,
    lastName: vendor.lastName,
    name: `${vendor.firstName} ${vendor.lastName}`.trim(),
    business: vendor.business,
    email: vendor.email,
    phone: vendor.phone,
    category: vendor.category,
    notes: vendor.notes,
    status: vendor.status,
    expired: approvalExpired(vendor),
    approvedUntil: vendor.approvedUntil,
    detailsDone: vendor.detailsDone,
    documentsDone: vendor.documentsDone,
    address: vendor.address,
    website: vendor.website,
    products: vendor.products,
    priceRange: vendor.priceRange,
    targetMarket: vendor.targetMarket,
    insuranceProvider: vendor.insuranceProvider,
    policyNumber: vendor.policyNumber,
    acks: parseAcks(vendor.acksJson),
    docs: documentNames(vendor.id),
  }
}

export type VendorProfile = ReturnType<typeof profile>

export const getVendorDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const database = getDatabase()
  sweepDeadlines(database)
  const vendor = requireVendor()
  const reservation = currentReservation(database, vendor.id)
  const rows: Array<DashboardRow> = reservation
    ? reservationRows(database, reservation.id).map((r) => ({ id: r.id, date: r.marketDate, stallId: r.stallId, status: r.status }))
    : []
  return {
    me: profile(vendor),
    notice: vendor.notice,
    spaceLost: vendor.spaceLost,
    holds: holdCount(database, vendor.id),
    lateCancellations: lateCancellations(database, vendor.id),
    now: now(),
    booking: reservation
      ? {
          plan: reservation.plan,
          stallId: reservation.stallId,
          perSaturday: reservation.perSaturday,
          summary: quote({ weekly: '0', seasonal: '0', tent: '0', table: '0', electricity: '' }, reservation.plan, reservation, reservation.otherExtras).summary,
          rows,
        }
      : null,
  }
})

export type VendorDashboard = Awaited<ReturnType<typeof getVendorDashboard>>

export const getVendorProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const vendor = requireVendor()
  return { me: profile(vendor) }
})

// ---------- Application ----------

type StepInput = {
  step: 1 | 2 | 3
  advance: boolean
  category?: string
  address?: string
  website?: string
  products?: string
  priceRange?: string
  targetMarket?: string
  insuranceProvider?: string
  policyNumber?: string
  acks?: Array<string>
}

export const saveApplication = createServerFn({ method: 'POST' })
  .validator((input: StepInput) => {
    if (![1, 2, 3].includes(input.step)) throw new Error('Unknown application step.')
    const out: StepInput = { step: input.step, advance: !!input.advance }
    const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)
    out.category = typeof input.category === 'string' && (input.category === '' || ALL_CATEGORIES.includes(input.category)) ? input.category : undefined
    out.address = clip(input.address, 300)
    out.website = clip(input.website, 300)
    out.products = clip(input.products, 2000)
    out.priceRange = typeof input.priceRange === 'string' && (input.priceRange === '' || PRICE_RANGES.includes(input.priceRange)) ? input.priceRange : undefined
    out.targetMarket = clip(input.targetMarket, 300)
    out.insuranceProvider = clip(input.insuranceProvider, 200)
    out.policyNumber = clip(input.policyNumber, 100)
    out.acks = Array.isArray(input.acks) ? input.acks.filter((k) => typeof k === 'string').slice(0, 4) : undefined
    return out
  })
  .handler(async ({ data }) => {
    const database = getDatabase()
    const vendor = requireVendor()
    if (vendor.status !== 'in_progress' && vendor.status !== 'rejected') throw new Error('Your application has already been submitted.')
    const patch: Partial<MarketVendor> = { updatedAt: iso() }
    if (data.step === 1) {
      if (data.category !== undefined && data.category !== '') patch.category = data.category
      for (const k of ['address', 'website', 'products', 'priceRange', 'targetMarket'] as const) {
        if (data[k] !== undefined) patch[k] = data[k]
      }
    }
    if (data.step === 2) {
      if (data.insuranceProvider !== undefined) patch.insuranceProvider = data.insuranceProvider
      if (data.policyNumber !== undefined) patch.policyNumber = data.policyNumber
    }
    if (data.step === 3 && data.acks) patch.acksJson = JSON.stringify(data.acks)

    const merged = { ...vendor, ...patch }
    if (data.advance) {
      const errors = stepErrors(data.step, {
        category: data.step === 1 ? data.category ?? '' : merged.category,
        address: merged.address,
        website: merged.website,
        products: merged.products,
        insuranceProvider: merged.insuranceProvider,
        policyNumber: merged.policyNumber,
        docs: documentNames(vendor.id),
        acks: parseAcks(merged.acksJson),
      })
      if (errors.length) {
        database.update(schema.marketVendors).set(patch).where(eq(schema.marketVendors.id, vendor.id)).run()
        return { errors }
      }
      if (data.step === 1) patch.detailsDone = true
      if (data.step === 2) patch.documentsDone = true
      if (data.step === 3) {
        // Agreements depend on the category, so they are kept only for the sections this vendor saw.
        patch.acksJson = JSON.stringify(ackKeys(merged.category))
        patch.status = 'pending'
        patch.submittedAt = iso()
        patch.notice = "Application submitted. We'll email you once it's reviewed."
      }
    } else {
      patch.notice = 'Your progress is saved. Finish your application any time.'
    }
    database.update(schema.marketVendors).set(patch).where(eq(schema.marketVendors.id, vendor.id)).run()
    if (data.advance && data.step === 3) audit(database, 'vendor', vendor.id, 'application.submitted', vendor.id, `${vendor.business} submitted their application.`)
    return { errors: [] as Array<string> }
  })

function sniffUpload(bytes: Uint8Array) {
  const starts = (sig: Array<number>, offset = 0) => sig.every((b, i) => bytes[offset + i] === b)
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return { ext: 'pdf', mime: 'application/pdf' }
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: 'png', mime: 'image/png' }
  if (starts([0xff, 0xd8, 0xff])) return { ext: 'jpg', mime: 'image/jpeg' }
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { ext: 'webp', mime: 'image/webp' }
  if (starts([0x66, 0x74, 0x79, 0x70], 4) && /heic|heix|mif1/.test(new TextDecoder().decode(bytes.slice(8, 12)))) return { ext: 'heic', mime: 'image/heic' }
  return null
}

export const uploadDocument = createServerFn({ method: 'POST' })
  .validator((formData: FormData) => {
    const kind = formData.get('kind')
    const file = formData.get('file')
    if (typeof kind !== 'string' || !DOC_KINDS.includes(kind as DocKind)) throw new Error('Unknown document.')
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose a file to upload.')
    if (file.size > 10 * 1024 * 1024) throw new Error('Files must be 10 MB or smaller.')
    return { kind: kind as DocKind, file }
  })
  .handler(async ({ data }) => {
    const database = getDatabase()
    const vendor = requireVendor()
    if (vendor.status !== 'in_progress' && vendor.status !== 'rejected') throw new Error('Your application has already been submitted.')
    const bytes = new Uint8Array(await data.file.arrayBuffer())
    const type = sniffUpload(bytes)
    if (!type) throw new Error('Upload a PDF or an image file.')
    const directory = resolve(getDataDirectory(), 'market-documents', vendor.id)
    await mkdir(directory, { recursive: true })
    const storedName = `${data.kind}-${crypto.randomUUID()}.${type.ext}`
    await writeFile(resolve(directory, storedName), bytes)
    const previous = database
      .select()
      .from(schema.marketDocuments)
      .where(and(eq(schema.marketDocuments.vendorId, vendor.id), eq(schema.marketDocuments.kind, data.kind)))
      .get()
    const fileName = basename(data.file.name).slice(0, 200) || `${data.kind}.${type.ext}`
    database
      .insert(schema.marketDocuments)
      .values({ id: newId('doc'), vendorId: vendor.id, kind: data.kind, fileName, storedName, mime: type.mime, size: data.file.size, uploadedAt: iso() })
      .onConflictDoUpdate({
        target: [schema.marketDocuments.vendorId, schema.marketDocuments.kind],
        set: { fileName, storedName, mime: type.mime, size: data.file.size, uploadedAt: iso() },
      })
      .run()
    if (previous) await rm(resolve(directory, previous.storedName), { force: true })
    return { kind: data.kind, fileName }
  })

// ---------- Plaza map ----------

type MapMode = { rebook?: string; append?: string; change?: boolean }

export const getMapData = createServerFn({ method: 'GET' })
  .validator((input: MapMode) => ({
    rebook: typeof input.rebook === 'string' ? input.rebook.slice(0, 120) : undefined,
    append: isMarketDate(input.append) ? input.append : undefined,
    change: !!input.change,
  }))
  .handler(async ({ data }) => {
    const database = getDatabase()
    sweepDeadlines(database)
    const vendor = requireVendor()
    assertCanReserve(database, vendor)
    const { prices, stock } = readSettings(database)
    const saturdays = upcomingSaturdays(5)
    const reservation = currentReservation(database, vendor.id)
    let fixedDate: string | null = null
    if (data.rebook || data.append) {
      if (!reservation) throw new Error('You have no reservation to add a Saturday to.')
      if (data.rebook) {
        const row = database.select().from(schema.marketBookings).where(and(eq(schema.marketBookings.id, data.rebook), eq(schema.marketBookings.reservationId, reservation.id))).get()
        if (!row || isActiveStatus(row.status) || now() >= saturdayOpensAt(row.marketDate)) throw new Error('That Saturday can no longer be booked again.')
        fixedDate = row.marketDate
      } else fixedDate = data.append ?? null
    }
    if (data.change) {
      const rows = reservation ? reservationRows(database, reservation.id) : []
      if (!reservation || rows.some((r) => r.status === 'paid' || r.status === 'confirming') || !rows.some((r) => isActiveStatus(r.status))) {
        throw new Error('This reservation can no longer change stalls.')
      }
    }
    const dates = fixedDate ? [fixedDate] : Array.from({ length: PLANS.seasonal.saturdays + saturdays.length }, (_, i) => addWeeks(saturdays[0]!, i))
    const taken = unavailableKeys(database, dates, data.change && reservation ? { reservationId: reservation.id } : undefined)
    return { prices, stock, saturdays, fixedDate, taken: [...taken] }
  })

export type MapData = Awaited<ReturnType<typeof getMapData>>

function selectionDates(plan: Plan, first: string) {
  return Array.from({ length: PLANS[plan].saturdays }, (_, i) => addWeeks(first, i))
}

type ReserveInput = {
  plan: Plan
  first: string
  stallId: number
  addons: Addons
  otherExtras: string
  change: boolean
}

export const reserveStall = createServerFn({ method: 'POST' })
  .validator((input: ReserveInput) => {
    if (!isPlan(input.plan)) throw new Error('Choose a plan.')
    if (!isMarketDate(input.first)) throw new Error('Choose your first Saturday.')
    if (!isStallId(Number(input.stallId))) throw new Error('Choose an open stall.')
    return {
      plan: input.plan,
      first: input.first,
      stallId: Number(input.stallId),
      addons: {
        tent: !!input.addons?.tent,
        electricity: !!input.addons?.electricity,
        tables: Math.max(0, Math.min(50, Math.floor(Number(input.addons?.tables) || 0))),
      },
      otherExtras: typeof input.otherExtras === 'string' ? input.otherExtras.trim().slice(0, 500) : '',
      change: !!input.change,
    }
  })
  .handler(async ({ data }) => {
    const database = getDatabase()
    sweepDeadlines(database)
    const vendor = requireVendor()
    if (!upcomingSaturdays(5).includes(data.first)) throw new Error('Choose one of the upcoming Saturdays.')
    database.transaction((tx) => {
      assertCanReserve(tx, vendor)
      const existing = currentReservation(tx, vendor.id)
      if (existing) {
        const rows = reservationRows(tx, existing.id)
        const active = rows.some((r) => isActiveStatus(r.status))
        if (data.change) {
          if (!active || rows.some((r) => r.status === 'paid' || r.status === 'confirming')) throw new Error('This reservation can no longer change stalls.')
        } else if (active) {
          throw new Error('You already have a reserved stall. Use Change stall on your dashboard.')
        }
        // Swapping stalls before any payment is not a cancellation: the old Saturdays simply go away.
        if (existing.addonsHeld) adjustStock(tx, { tables: existing.tables, electricity: existing.electricity ? 1 : 0 })
        tx.delete(schema.marketBookings).where(eq(schema.marketBookings.reservationId, existing.id)).run()
        tx.update(schema.marketReservations).set({ current: false, addonsHeld: false }).where(eq(schema.marketReservations.id, existing.id)).run()
      }
      const dates = selectionDates(data.plan, data.first)
      const taken = unavailableKeys(tx, dates)
      const blocked = dates.find((d) => isTaken(taken, d, data.stallId))
      if (blocked) throw new Error(`Stall ${stallLabel(data.stallId)} isn't available on ${fmtDay(blocked)}. Choose another stall.`)
      const { prices, stock } = readSettings(tx)
      if (data.addons.electricity && stock.electricity < 1) throw new Error('Electricity has sold out. Remove it to continue.')
      if (data.addons.tables > stock.tables) throw new Error(`Only ${stock.tables} tables are available.`)
      adjustStock(tx, { tables: -data.addons.tables, electricity: data.addons.electricity ? -1 : 0 })
      const q = quote(prices, data.plan, data.addons, data.otherExtras)
      const reservationId = newId('reservation')
      tx.insert(schema.marketReservations)
        .values({
          id: reservationId,
          vendorId: vendor.id,
          plan: data.plan,
          stallId: data.stallId,
          perSaturday: q.perSaturday,
          ...data.addons,
          otherExtras: data.otherExtras,
          addonsHeld: true,
          current: true,
          createdAt: iso(),
        })
        .run()
      for (const date of dates) {
        tx.insert(schema.marketBookings)
          .values({
            id: newId('booking'),
            marketDate: date,
            stallId: data.stallId,
            reservationId,
            vendorId: vendor.id,
            plan: data.plan,
            amount: q.perSaturday,
            ...data.addons,
            status: 'due',
            source: 'Online',
            createdAt: iso(),
            updatedAt: iso(),
          })
          .run()
      }
      setNotice(tx, vendor.id, '')
      audit(tx, 'vendor', vendor.id, 'reservation.created', reservationId, `Reserved stall ${stallLabel(data.stallId)} on the ${PLANS[data.plan].name.toLowerCase()} from ${fmtDay(data.first)}.`)
    })
    return { ok: true }
  })

// Books one Saturday that was released or cancelled, or the Saturday after the last one, on any open stall.
export const bookSaturday = createServerFn({ method: 'POST' })
  .validator((input: { rebook?: string; append?: string; stallId: number }) => {
    if (!isStallId(Number(input.stallId))) throw new Error('Choose an open stall.')
    return {
      rebook: typeof input.rebook === 'string' ? input.rebook.slice(0, 120) : undefined,
      append: isMarketDate(input.append) ? input.append : undefined,
      stallId: Number(input.stallId),
    }
  })
  .handler(async ({ data }) => {
    const database = getDatabase()
    sweepDeadlines(database)
    const vendor = requireVendor()
    let outcome = { ok: true } as { ok: true } | { ok: false; message: string }
    database.transaction((tx) => {
      assertCanReserve(tx, vendor)
      const reservation = currentReservation(tx, vendor.id)
      if (!reservation) throw new Error('You have no reservation to add a Saturday to.')
      const row = data.rebook
        ? tx.select().from(schema.marketBookings).where(and(eq(schema.marketBookings.id, data.rebook), eq(schema.marketBookings.reservationId, reservation.id))).get()
        : null
      const date = row ? row.marketDate : data.append
      if (!date || (row && isActiveStatus(row.status)) || now() >= saturdayOpensAt(date)) throw new Error('That Saturday can no longer be booked.')
      if (!row && reservationRows(tx, reservation.id).some((r) => r.marketDate === date && isActiveStatus(r.status))) throw new Error('That Saturday is already booked.')
      if (isTaken(unavailableKeys(tx, [date]), date, data.stallId)) throw new Error(`Stall ${stallLabel(data.stallId)} isn't available on ${fmtDay(date)}. Choose another stall.`)
      if (!takeAddons(tx, reservation)) {
        setNotice(tx, vendor.id, 'Your add-ons are no longer available for this booking. Please contact the market office.')
        outcome = { ok: false, message: 'add-ons' }
        return
      }
      if (row) {
        tx.update(schema.marketBookings).set({ status: 'due', stallId: data.stallId, amount: reservation.perSaturday, updatedAt: iso() }).where(eq(schema.marketBookings.id, row.id)).run()
      } else {
        tx.insert(schema.marketBookings)
          .values({
            id: newId('booking'),
            marketDate: date,
            stallId: data.stallId,
            reservationId: reservation.id,
            vendorId: vendor.id,
            plan: reservation.plan,
            amount: reservation.perSaturday,
            tent: reservation.tent,
            tables: reservation.tables,
            electricity: reservation.electricity,
            status: 'due',
            source: 'Online',
            createdAt: iso(),
            updatedAt: iso(),
          })
          .run()
      }
      setNotice(tx, vendor.id, `Stall ${stallLabel(data.stallId)} is reserved for ${fmtDay(date)}.`)
    })
    return outcome
  })

// Weekly plan: the Saturday after the last one, on the same stall.
export const reserveNextSaturday = createServerFn({ method: 'POST' }).handler(async () => {
  const database = getDatabase()
  sweepDeadlines(database)
  const vendor = requireVendor()
  let result = { ok: true } as { ok: true } | { ok: false; date: string; message: string }
  database.transaction((tx) => {
    assertCanReserve(tx, vendor)
    const reservation = currentReservation(tx, vendor.id)
    if (!reservation || reservation.plan !== 'weekly') throw new Error('Only weekly reservations can add the next Saturday.')
    const rows = reservationRows(tx, reservation.id)
    const last = rows[rows.length - 1]
    if (!last) throw new Error('You have no reservation to add a Saturday to.')
    const date = addWeeks(last.marketDate, 1)
    if (isTaken(unavailableKeys(tx, [date]), date, last.stallId)) {
      result = { ok: false, date, message: `Stall ${stallLabel(last.stallId)} isn't available on ${fmtDay(date)}.` }
      setNotice(tx, vendor.id, '')
      return
    }
    if (!takeAddons(tx, reservation)) {
      setNotice(tx, vendor.id, 'Your add-ons are no longer available for this booking. Please contact the market office.')
      return
    }
    tx.insert(schema.marketBookings)
      .values({
        id: newId('booking'),
        marketDate: date,
        stallId: last.stallId,
        reservationId: reservation.id,
        vendorId: vendor.id,
        plan: reservation.plan,
        amount: reservation.perSaturday,
        tent: reservation.tent,
        tables: reservation.tables,
        electricity: reservation.electricity,
        status: 'due',
        source: 'Online',
        createdAt: iso(),
        updatedAt: iso(),
      })
      .run()
    setNotice(tx, vendor.id, '')
  })
  return result
})

// ---------- Cancellations ----------

export const cancelSaturdays = createServerFn({ method: 'POST' })
  .validator((input: { bookingId?: string; all?: boolean }) => ({
    bookingId: typeof input.bookingId === 'string' ? input.bookingId.slice(0, 120) : undefined,
    all: !!input.all,
  }))
  .handler(async ({ data }) => {
    const database = getDatabase()
    sweepDeadlines(database)
    const vendor = requireVendor()
    database.transaction((tx) => {
      const reservation = currentReservation(tx, vendor.id)
      if (!reservation) throw new Error('You have no reservation to cancel.')
      const rows = reservationRows(tx, reservation.id).filter((r) => isActiveStatus(r.status) && now() < saturdayOpensAt(r.marketDate))
      const targets = data.all ? rows : rows.filter((r) => r.id === data.bookingId)
      if (!targets.length) throw new Error('That Saturday can no longer be cancelled.')
      const at = now()
      for (const row of targets) {
        tx.update(schema.marketBookings).set({ status: 'cancelled', updatedAt: iso() }).where(eq(schema.marketBookings.id, row.id)).run()
        tx.insert(schema.marketCancellations).values({ id: newId('cancellation'), vendorId: vendor.id, cancelledAt: at, late: isLate(row.marketDate, at) }).run()
      }
      const first = targets[0]!
      const late = isLate(first.marketDate, at)
      settleReservation(tx, vendor.id, reservation.id, data.all ? 'Your reservation was cancelled.' : `${fmtDay(first.marketDate)} was cancelled${late ? ' with less than 72 hours’ notice' : ''}.`)
      audit(tx, 'vendor', vendor.id, 'reservation.cancelled', reservation.id, `Cancelled ${targets.length} Saturday(s).`)
    })
    return { ok: true }
  })

// ---------- Payment ----------

function dueRowsFor(vendorId: string, ids: Array<string>) {
  const database = getDatabase()
  const reservation = currentReservation(database, vendorId)
  if (!reservation || !ids.length) return { reservation, rows: [] }
  const rows = database
    .select()
    .from(schema.marketBookings)
    .where(and(eq(schema.marketBookings.reservationId, reservation.id), eq(schema.marketBookings.status, 'due'), inArray(schema.marketBookings.id, ids)))
    .all()
    .sort((a, b) => a.marketDate.localeCompare(b.marketDate))
  return { reservation, rows }
}

const idList = (input: { ids: Array<string> }) => ({
  ids: Array.isArray(input.ids) ? input.ids.filter((id) => typeof id === 'string').slice(0, 30) : [],
})

export const getPaymentSummary = createServerFn({ method: 'GET' })
  .validator(idList)
  .handler(async ({ data }) => {
    sweepDeadlines(getDatabase())
    const vendor = requireVendor()
    const { reservation, rows } = dueRowsFor(vendor.id, data.ids)
    if (!reservation || !rows.length) return null
    return { stallId: reservation.stallId, perSaturday: reservation.perSaturday, rows: rows.map((r) => ({ id: r.id, date: r.marketDate, amount: r.amount })) }
  })

// No payment provider is connected yet: the Saturdays wait as "Confirming" until the market team marks them paid.
export const submitPayment = createServerFn({ method: 'POST' })
  .validator(idList)
  .handler(async ({ data }) => {
    const database = getDatabase()
    sweepDeadlines(database)
    const vendor = requireVendor()
    const { reservation, rows } = dueRowsFor(vendor.id, data.ids)
    if (!reservation || !rows.length) throw new Error('These Saturdays are no longer due.')
    database.transaction((tx) => {
      tx.update(schema.marketBookings)
        .set({ status: 'confirming', updatedAt: iso() })
        .where(inArray(schema.marketBookings.id, rows.map((r) => r.id)))
        .run()
      setNotice(tx, vendor.id, '')
      audit(tx, 'vendor', vendor.id, 'payment.submitted', reservation.id, `Submitted payment for ${rows.length} Saturday(s); awaiting confirmation.`)
    })
    return { ok: true }
  })

// ---------- Account ----------

export const requestPasswordChange = createServerFn({ method: 'POST' }).handler(async () => {
  const vendor = requireVendor()
  const link = issueToken(vendor.id, 'reset_password')
  sendMarketEmail({ to: vendor.email, subject: 'Change your Farmers Market password', link })
  return { email: vendor.email }
})

export const requestPasswordReset = createServerFn({ method: 'POST' })
  .validator((input: { email: string }) => ({ email: String(input.email ?? '').trim().toLowerCase().slice(0, 320) }))
  .handler(async ({ data }) => {
    const vendor = getDatabase().select().from(schema.marketVendors).where(eq(schema.marketVendors.email, data.email)).get()
    if (vendor) sendMarketEmail({ to: vendor.email, subject: 'Change your Farmers Market password', link: issueToken(vendor.id, 'reset_password') })
    return { ok: true }
  })

export const deleteVendorAccount = createServerFn({ method: 'POST' }).handler(async () => {
  const database = getDatabase()
  const vendor = requireVendor()
  database.transaction((tx) => {
    const reservation = currentReservation(tx, vendor.id)
    if (reservation?.addonsHeld) adjustStock(tx, { tables: reservation.tables, electricity: reservation.electricity ? 1 : 0 })
    // Admin-entered bookings for this vendor are removed with the account; their add-ons go back to stock.
    const adminRows = tx
      .select()
      .from(schema.marketBookings)
      .where(and(eq(schema.marketBookings.vendorId, vendor.id), isNull(schema.marketBookings.reservationId), inArray(schema.marketBookings.status, ACTIVE_STATUSES)))
      .all()
    for (const row of adminRows) adjustStock(tx, { tables: row.tables, electricity: row.electricity ? 1 : 0 })
    tx.delete(schema.marketVendors).where(eq(schema.marketVendors.id, vendor.id)).run()
    audit(tx, 'vendor', null, 'vendor.deleted', vendor.id, `${vendor.business} deleted their account.`)
  })
  await rm(resolve(getDataDirectory(), 'market-documents', vendor.id), { recursive: true, force: true })
  endAllSessions('vendor', vendor.id)
  endSession('vendor')
  return { ok: true }
})

