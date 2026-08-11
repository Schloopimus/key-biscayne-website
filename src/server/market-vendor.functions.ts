import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, gte } from 'drizzle-orm'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { getDataDirectory, getDatabase } from './db'
import * as schema from './db/schema'
import type { Booking, EventStall, Vendor, VendorApplication } from './db/schema'

export type VendorBookingSummary = {
  id: string
  status: Booking['status']
  priceCents: number
  reservedAt: string
  updatedAt: string
  eventStallId: string
  eventId: string
  marketDate: string
  label: string
  startTime: string
  endTime: string
  stallCode: string
  tier: EventStall['tier']
}

export type VendorSnapshot = {
  vendor: Vendor | null
  application: VendorApplication | null
  bookings: Array<VendorBookingSummary>
}

export type AvailableStall = {
  eventId: string
  marketDate: string
  label: string
  startTime: string
  endTime: string
  eventStallId: string
  stallCode: string
  description: string
  tier: EventStall['tier']
  priceCents: number
  bookingId: string | null
  bookedVendorId: string | null
}

export type AvailableMarketEvent = {
  id: string
  marketDate: string
  label: string
  startTime: string
  endTime: string
  stalls: Array<AvailableStall>
}

function requiredFormField(formData: FormData, name: string, label: string, maximum = 300) {
  const value = formData.get(name)
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} is required.`)
  if (value.trim().length > maximum) throw new Error(`${label} is too long.`)
  return value.trim()
}

function optionalFormField(formData: FormData, name: string, maximum = 300) {
  const value = formData.get(name)
  if (typeof value !== 'string' || value.trim().length === 0) return null
  if (value.trim().length > maximum) throw new Error(`${name} is too long.`)
  return value.trim()
}

function validateEntityId(value: string, prefix: string, label: string) {
  if (!value.startsWith(prefix) || value.length > 120) throw new Error(`Invalid ${label}.`)
  return value
}

export const submitVendorApplication = createServerFn({ method: 'POST' })
  .validator((formData: FormData) => {
    const email = requiredFormField(formData, 'email', 'Email address', 320)
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.')

    const certificate = formData.get('certificate')
    if (!(certificate instanceof File) || certificate.size === 0) {
      throw new Error('Upload a health department certificate.')
    }
    if (certificate.size > 5 * 1024 * 1024) throw new Error('The certificate must be 5 MB or smaller.')

    return {
      vendorId: optionalFormField(formData, 'vendorId', 120),
      businessName: requiredFormField(formData, 'businessName', 'Business name'),
      productCategory: requiredFormField(formData, 'productCategory', 'Product category'),
      contactName: requiredFormField(formData, 'contactName', 'Contact name'),
      email: email.toLowerCase(),
      phone: requiredFormField(formData, 'phone', 'Phone number', 60),
      details: requiredFormField(formData, 'details', 'Business details', 2_000),
      certificate,
    }
  })
  .handler(async ({ data }) => {
    

    const database = getDatabase()
    const now = new Date().toISOString()
    const existingVendor = data.vendorId
      ? database.select().from(schema.vendors).where(eq(schema.vendors.id, data.vendorId)).get()
      : database.select().from(schema.vendors).where(eq(schema.vendors.email, data.email)).get()

    if (data.vendorId && !existingVendor) {
      throw new Error('This local vendor profile no longer exists. Start a new demo profile.')
    }

    const vendorId = existingVendor?.id ?? `vendor-${crypto.randomUUID()}`
    const latestApplication = existingVendor
      ? database
          .select()
          .from(schema.vendorApplications)
          .where(eq(schema.vendorApplications.vendorId, vendorId))
          .orderBy(desc(schema.vendorApplications.revision))
          .limit(1)
          .get()
      : null

    if (latestApplication?.status === 'pending') throw new Error('This application is already pending review.')
    if (latestApplication?.status === 'approved') throw new Error('This vendor is already approved.')

    const applicationId = `application-${crypto.randomUUID()}`
    const fileBytes = new Uint8Array(await data.certificate.arrayBuffer())
    const isPdf = fileBytes.length >= 5 && new TextDecoder().decode(fileBytes.slice(0, 5)) === '%PDF-'
    const isPng =
      fileBytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => fileBytes[index] === byte)
    const isJpeg = fileBytes.length >= 3 && fileBytes[0] === 255 && fileBytes[1] === 216 && fileBytes[2] === 255

    if (!isPdf && !isPng && !isJpeg) {
      throw new Error('Upload a valid PDF, PNG, or JPEG certificate.')
    }

    const extension = isPdf ? 'pdf' : isPng ? 'png' : 'jpg'
    const certificateMime = isPdf ? 'application/pdf' : isPng ? 'image/png' : 'image/jpeg'
    const certificateStoredName = `${applicationId}.${extension}`
    const certificateDirectory = resolve(getDataDirectory(), 'certificates')
    const certificatePath = resolve(certificateDirectory, certificateStoredName)
    await mkdir(certificateDirectory, { recursive: true })
    await writeFile(certificatePath, fileBytes)

    try {
      database.transaction((transaction) => {
        if (existingVendor) {
          transaction
            .update(schema.vendors)
            .set({ email: data.email, contactName: data.contactName, updatedAt: now })
            .where(eq(schema.vendors.id, vendorId))
            .run()
        } else {
          transaction
            .insert(schema.vendors)
            .values({
              id: vendorId,
              email: data.email,
              contactName: data.contactName,
              createdAt: now,
              updatedAt: now,
            })
            .run()
        }

        transaction
          .insert(schema.vendorApplications)
          .values({
            id: applicationId,
            vendorId,
            revision: (latestApplication?.revision ?? 0) + 1,
            status: 'pending',
            businessName: data.businessName,
            productCategory: data.productCategory,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            details: data.details,
            certificateFileName: basename(data.certificate.name).slice(0, 240) || `certificate.${extension}`,
            certificateStoredName,
            certificateMime,
            certificateSize: data.certificate.size,
            rejectionReason: null,
            submittedAt: now,
            reviewedAt: null,
          })
          .run()

        transaction
          .insert(schema.auditLogs)
          .values({
            id: `audit-${crypto.randomUUID()}`,
            actorKind: 'local-vendor',
            actorId: vendorId,
            action: latestApplication ? 'application.reapplied' : 'application.submitted',
            entityType: 'vendor-application',
            entityId: applicationId,
            summary: `${data.businessName} submitted application revision ${(latestApplication?.revision ?? 0) + 1}.`,
            createdAt: now,
          })
          .run()
      })
    } catch (error) {
      await rm(certificatePath, { force: true })
      throw error
    }

    return { vendorId, applicationId }
  })

export const getVendorSnapshot = createServerFn({ method: 'GET' })
  .validator((data: { vendorId: string | null }) => data)
  .handler(async ({ data }): Promise<VendorSnapshot> => {
    if (!data.vendorId) return { vendor: null, application: null, bookings: [] }

    
    const database = getDatabase()
    const vendor = database.select().from(schema.vendors).where(eq(schema.vendors.id, data.vendorId)).get()
    if (!vendor) return { vendor: null, application: null, bookings: [] }

    const application = database
      .select()
      .from(schema.vendorApplications)
      .where(eq(schema.vendorApplications.vendorId, vendor.id))
      .orderBy(desc(schema.vendorApplications.revision))
      .limit(1)
      .get()

    const vendorBookings = database
      .select({
        id: schema.bookings.id,
        status: schema.bookings.status,
        priceCents: schema.bookings.priceCents,
        reservedAt: schema.bookings.reservedAt,
        updatedAt: schema.bookings.updatedAt,
        eventStallId: schema.eventStalls.id,
        eventId: schema.marketEvents.id,
        marketDate: schema.marketEvents.marketDate,
        label: schema.marketEvents.label,
        startTime: schema.marketEvents.startTime,
        endTime: schema.marketEvents.endTime,
        stallCode: schema.stalls.code,
        tier: schema.eventStalls.tier,
      })
      .from(schema.bookings)
      .innerJoin(schema.eventStalls, eq(schema.bookings.eventStallId, schema.eventStalls.id))
      .innerJoin(schema.stalls, eq(schema.eventStalls.stallId, schema.stalls.id))
      .innerJoin(schema.marketEvents, eq(schema.eventStalls.eventId, schema.marketEvents.id))
      .where(eq(schema.bookings.vendorId, vendor.id))
      .orderBy(desc(schema.marketEvents.marketDate))
      .all()

    return { vendor, application: application ?? null, bookings: vendorBookings }
  })

export const getAvailableStalls = createServerFn({ method: 'GET' })
  .validator((data: { vendorId: string }) => ({
    vendorId: validateEntityId(data.vendorId, 'vendor-', 'vendor'),
  }))
  .handler(async ({ data }): Promise<Array<AvailableMarketEvent>> => {
    
    const database = getDatabase()
    const application = database
      .select()
      .from(schema.vendorApplications)
      .where(eq(schema.vendorApplications.vendorId, data.vendorId))
      .orderBy(desc(schema.vendorApplications.revision))
      .limit(1)
      .get()

    if (application?.status !== 'approved') throw new Error('The vendor application must be approved first.')

    const rows = database
      .select({
        eventId: schema.marketEvents.id,
        marketDate: schema.marketEvents.marketDate,
        label: schema.marketEvents.label,
        startTime: schema.marketEvents.startTime,
        endTime: schema.marketEvents.endTime,
        eventStallId: schema.eventStalls.id,
        stallCode: schema.stalls.code,
        description: schema.stalls.description,
        tier: schema.eventStalls.tier,
        priceCents: schema.eventStalls.priceCents,
        bookingId: schema.bookings.id,
        bookedVendorId: schema.bookings.vendorId,
      })
      .from(schema.eventStalls)
      .innerJoin(schema.marketEvents, eq(schema.eventStalls.eventId, schema.marketEvents.id))
      .innerJoin(schema.stalls, eq(schema.eventStalls.stallId, schema.stalls.id))
      .leftJoin(
        schema.bookings,
        and(eq(schema.bookings.eventStallId, schema.eventStalls.id), eq(schema.bookings.status, 'reserved')),
      )
      .where(
        and(
          eq(schema.marketEvents.status, 'open'),
          gte(schema.marketEvents.marketDate, new Date().toISOString().slice(0, 10)),
          eq(schema.eventStalls.active, true),
          eq(schema.stalls.active, true),
        ),
      )
      .orderBy(asc(schema.marketEvents.marketDate), asc(schema.stalls.code))
      .all()

    const events = new Map<string, AvailableMarketEvent>()

    for (const row of rows) {
      const event = events.get(row.eventId) ?? {
        id: row.eventId,
        marketDate: row.marketDate,
        label: row.label,
        startTime: row.startTime,
        endTime: row.endTime,
        stalls: [],
      }
      event.stalls.push(row)
      events.set(row.eventId, event)
    }

    return [...events.values()]
  })

export const createLocalBooking = createServerFn({ method: 'POST' })
  .validator((data: { vendorId: string; eventStallId: string }) => ({
    vendorId: validateEntityId(data.vendorId, 'vendor-', 'vendor'),
    eventStallId: validateEntityId(data.eventStallId, 'market-', 'stall selection'),
  }))
  .handler(async ({ data }) => {
    
    const database = getDatabase()
    const now = new Date().toISOString()
    const bookingId = `booking-${crypto.randomUUID()}`

    try {
      database.transaction((transaction) => {
        const application = transaction
          .select()
          .from(schema.vendorApplications)
          .where(eq(schema.vendorApplications.vendorId, data.vendorId))
          .orderBy(desc(schema.vendorApplications.revision))
          .limit(1)
          .get()
        if (application?.status !== 'approved') throw new Error('The vendor application must be approved first.')

        const target = transaction
          .select({
            eventStallId: schema.eventStalls.id,
            eventId: schema.marketEvents.id,
            marketDate: schema.marketEvents.marketDate,
            eventStatus: schema.marketEvents.status,
            eventStallActive: schema.eventStalls.active,
            stallActive: schema.stalls.active,
            priceCents: schema.eventStalls.priceCents,
            stallCode: schema.stalls.code,
          })
          .from(schema.eventStalls)
          .innerJoin(schema.marketEvents, eq(schema.eventStalls.eventId, schema.marketEvents.id))
          .innerJoin(schema.stalls, eq(schema.eventStalls.stallId, schema.stalls.id))
          .where(eq(schema.eventStalls.id, data.eventStallId))
          .get()

        if (!target || target.eventStatus !== 'open' || !target.eventStallActive || !target.stallActive) {
          throw new Error('This stall is not available.')
        }

        const existingBooking = transaction
          .select({ id: schema.bookings.id })
          .from(schema.bookings)
          .innerJoin(schema.eventStalls, eq(schema.bookings.eventStallId, schema.eventStalls.id))
          .where(
            and(
              eq(schema.bookings.vendorId, data.vendorId),
              eq(schema.bookings.status, 'reserved'),
              eq(schema.eventStalls.eventId, target.eventId),
            ),
          )
          .get()
        if (existingBooking) throw new Error('This vendor already has a stall reserved for that market date.')

        transaction
          .insert(schema.bookings)
          .values({
            id: bookingId,
            vendorId: data.vendorId,
            eventStallId: data.eventStallId,
            status: 'reserved',
            priceCents: target.priceCents,
            reservedAt: now,
            updatedAt: now,
          })
          .run()
        transaction
          .insert(schema.auditLogs)
          .values({
            id: `audit-${crypto.randomUUID()}`,
            actorKind: 'local-vendor',
            actorId: data.vendorId,
            action: 'booking.created',
            entityType: 'booking',
            entityId: bookingId,
            summary: `Reserved stall ${target.stallCode} for ${target.marketDate}. Payment is not connected.`,
            createdAt: now,
          })
          .run()
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('That stall was just reserved. Choose another available stall.')
      }
      throw error
    }

    return { bookingId }
  })

export const changeLocalBooking = createServerFn({ method: 'POST' })
  .validator((data: { vendorId: string; bookingId: string; eventStallId: string }) => ({
    vendorId: validateEntityId(data.vendorId, 'vendor-', 'vendor'),
    bookingId: validateEntityId(data.bookingId, 'booking-', 'booking'),
    eventStallId: validateEntityId(data.eventStallId, 'market-', 'stall selection'),
  }))
  .handler(async ({ data }) => {
    
    const database = getDatabase()
    const now = new Date().toISOString()

    try {
      database.transaction((transaction) => {
        const current = transaction
          .select({ eventId: schema.eventStalls.eventId })
          .from(schema.bookings)
          .innerJoin(schema.eventStalls, eq(schema.bookings.eventStallId, schema.eventStalls.id))
          .where(
            and(
              eq(schema.bookings.id, data.bookingId),
              eq(schema.bookings.vendorId, data.vendorId),
              eq(schema.bookings.status, 'reserved'),
            ),
          )
          .get()
        if (!current) throw new Error('Active booking not found.')

        const target = transaction
          .select({
            eventId: schema.eventStalls.eventId,
            priceCents: schema.eventStalls.priceCents,
            stallCode: schema.stalls.code,
            active: schema.eventStalls.active,
          })
          .from(schema.eventStalls)
          .innerJoin(schema.stalls, eq(schema.eventStalls.stallId, schema.stalls.id))
          .where(eq(schema.eventStalls.id, data.eventStallId))
          .get()
        if (!target || !target.active || target.eventId !== current.eventId) {
          throw new Error('Choose an available stall from the same market date.')
        }

        transaction
          .update(schema.bookings)
          .set({ eventStallId: data.eventStallId, priceCents: target.priceCents, updatedAt: now })
          .where(eq(schema.bookings.id, data.bookingId))
          .run()
        transaction
          .insert(schema.auditLogs)
          .values({
            id: `audit-${crypto.randomUUID()}`,
            actorKind: 'local-vendor',
            actorId: data.vendorId,
            action: 'booking.changed',
            entityType: 'booking',
            entityId: data.bookingId,
            summary: `Changed local reservation to stall ${target.stallCode}.`,
            createdAt: now,
          })
          .run()
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error('That stall was just reserved. Choose another available stall.')
      }
      throw error
    }

    return { bookingId: data.bookingId }
  })

export const cancelLocalBooking = createServerFn({ method: 'POST' })
  .validator((data: { vendorId: string; bookingId: string }) => ({
    vendorId: validateEntityId(data.vendorId, 'vendor-', 'vendor'),
    bookingId: validateEntityId(data.bookingId, 'booking-', 'booking'),
  }))
  .handler(async ({ data }) => {
    
    const database = getDatabase()
    const now = new Date().toISOString()
    const activeBooking = database
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.id, data.bookingId),
          eq(schema.bookings.vendorId, data.vendorId),
          eq(schema.bookings.status, 'reserved'),
        ),
      )
      .get()
    if (!activeBooking) throw new Error('Active booking not found.')

    database
      .update(schema.bookings)
      .set({ status: 'cancelled', updatedAt: now })
      .where(eq(schema.bookings.id, data.bookingId))
      .run()

    database
      .insert(schema.auditLogs)
      .values({
        id: `audit-${crypto.randomUUID()}`,
        actorKind: 'local-vendor',
        actorId: data.vendorId,
        action: 'booking.cancelled',
        entityType: 'booking',
        entityId: data.bookingId,
        summary: 'Cancelled a local reservation. No payment or refund was involved.',
        createdAt: now,
      })
      .run()

    return { bookingId: data.bookingId }
  })
