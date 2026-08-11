import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq } from 'drizzle-orm'
import { getDatabase } from './db'
import * as schema from './db/schema'

function checkedId(value: string, prefix: string, label: string) {
  if (!value.startsWith(prefix) || value.length > 120) throw new Error(`Invalid ${label}.`)
  return value
}

function checkedText(value: string, label: string, maximum = 300) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required.`)
  if (normalized.length > maximum) throw new Error(`${label} is too long.`)
  return normalized
}

export const getAdminDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  
  const database = getDatabase()

  const pendingApplications = database
    .select({
      id: schema.vendorApplications.id,
      businessName: schema.vendorApplications.businessName,
      productCategory: schema.vendorApplications.productCategory,
      contactName: schema.vendorApplications.contactName,
      email: schema.vendorApplications.email,
      submittedAt: schema.vendorApplications.submittedAt,
      revision: schema.vendorApplications.revision,
    })
    .from(schema.vendorApplications)
    .where(eq(schema.vendorApplications.status, 'pending'))
    .orderBy(desc(schema.vendorApplications.submittedAt))
    .limit(8)
    .all()

  const recentActivity = database
    .select()
    .from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(10)
    .all()

  return {
    counts: {
      pendingApplications:
        database
          .select({ value: count() })
          .from(schema.vendorApplications)
          .where(eq(schema.vendorApplications.status, 'pending'))
          .get()?.value ?? 0,
      approvedVendors:
        database
          .select({ value: count() })
          .from(schema.vendorApplications)
          .where(eq(schema.vendorApplications.status, 'approved'))
          .get()?.value ?? 0,
      activeBookings:
        database
          .select({ value: count() })
          .from(schema.bookings)
          .where(eq(schema.bookings.status, 'reserved'))
          .get()?.value ?? 0,
      openDates:
        database
          .select({ value: count() })
          .from(schema.marketEvents)
          .where(eq(schema.marketEvents.status, 'open'))
          .get()?.value ?? 0,
    },
    pendingApplications,
    recentActivity,
  }
})

export const listVendorApplications = createServerFn({ method: 'GET' }).handler(async () => {
  

  return getDatabase()
    .select({
      id: schema.vendorApplications.id,
      vendorId: schema.vendorApplications.vendorId,
      revision: schema.vendorApplications.revision,
      status: schema.vendorApplications.status,
      businessName: schema.vendorApplications.businessName,
      productCategory: schema.vendorApplications.productCategory,
      contactName: schema.vendorApplications.contactName,
      email: schema.vendorApplications.email,
      phone: schema.vendorApplications.phone,
      submittedAt: schema.vendorApplications.submittedAt,
      reviewedAt: schema.vendorApplications.reviewedAt,
    })
    .from(schema.vendorApplications)
    .innerJoin(schema.vendors, eq(schema.vendorApplications.vendorId, schema.vendors.id))
    .orderBy(desc(schema.vendorApplications.submittedAt))
    .all()
})

export const getApplicationForAdmin = createServerFn({ method: 'GET' })
  .validator((data: { applicationId: string }) => ({
    applicationId: checkedId(data.applicationId, 'application-', 'application'),
  }))
  .handler(async ({ data }) => {
    
    const database = getDatabase()
    const application = database
      .select()
      .from(schema.vendorApplications)
      .where(eq(schema.vendorApplications.id, data.applicationId))
      .get()
    if (!application) throw new Error('Application not found.')

    const history = database
      .select({
        id: schema.vendorApplications.id,
        revision: schema.vendorApplications.revision,
        status: schema.vendorApplications.status,
        rejectionReason: schema.vendorApplications.rejectionReason,
        submittedAt: schema.vendorApplications.submittedAt,
        reviewedAt: schema.vendorApplications.reviewedAt,
      })
      .from(schema.vendorApplications)
      .where(eq(schema.vendorApplications.vendorId, application.vendorId))
      .orderBy(desc(schema.vendorApplications.revision))
      .all()

    return { application, history }
  })

export const reviewVendorApplication = createServerFn({ method: 'POST' })
  .validator((data: { applicationId: string; decision: 'approved' | 'rejected'; reason?: string }) => {
    const applicationId = checkedId(data.applicationId, 'application-', 'application')
    if (data.decision !== 'approved' && data.decision !== 'rejected') throw new Error('Invalid decision.')
    const reason = data.reason?.trim() ?? ''
    if (data.decision === 'rejected' && !reason) throw new Error('Give the vendor a rejection reason.')
    if (reason.length > 1_000) throw new Error('The rejection reason is too long.')
    return { applicationId, decision: data.decision, reason: reason || null }
  })
  .handler(async ({ data }) => {
    
    const database = getDatabase()
    const application = database
      .select()
      .from(schema.vendorApplications)
      .where(eq(schema.vendorApplications.id, data.applicationId))
      .get()
    if (!application) throw new Error('Application not found.')
    if (application.status !== 'pending') throw new Error('This application has already been reviewed.')

    const now = new Date().toISOString()
    database.transaction((transaction) => {
      transaction
        .update(schema.vendorApplications)
        .set({ status: data.decision, rejectionReason: data.reason, reviewedAt: now })
        .where(eq(schema.vendorApplications.id, data.applicationId))
        .run()
      transaction
        .insert(schema.auditLogs)
        .values({
          id: `audit-${crypto.randomUUID()}`,
          actorKind: 'local-admin',
          actorId: null,
          action: `application.${data.decision}`,
          entityType: 'vendor-application',
          entityId: data.applicationId,
          summary:
            data.decision === 'approved'
              ? `Approved ${application.businessName}.`
              : `Rejected ${application.businessName}: ${data.reason}`,
          createdAt: now,
        })
        .run()
    })

    return { applicationId: data.applicationId, status: data.decision }
  })

export const listAdminVendors = createServerFn({ method: 'GET' }).handler(async () => {
  
  const database = getDatabase()
  const vendorRows = database.select().from(schema.vendors).orderBy(desc(schema.vendors.createdAt)).all()

  return vendorRows.map((vendor) => {
    const application = database
      .select({
        id: schema.vendorApplications.id,
        businessName: schema.vendorApplications.businessName,
        productCategory: schema.vendorApplications.productCategory,
        status: schema.vendorApplications.status,
        revision: schema.vendorApplications.revision,
        phone: schema.vendorApplications.phone,
        certificateFileName: schema.vendorApplications.certificateFileName,
      })
      .from(schema.vendorApplications)
      .where(eq(schema.vendorApplications.vendorId, vendor.id))
      .orderBy(desc(schema.vendorApplications.revision))
      .limit(1)
      .get()
    return { ...vendor, application: application ?? null }
  })
})

export const getMarketAdministration = createServerFn({ method: 'GET' }).handler(async () => {
  
  const database = getDatabase()
  const events = database.select().from(schema.marketEvents).orderBy(asc(schema.marketEvents.marketDate)).all()

  return events.map((event) => {
    const inventory = database
      .select({
        id: schema.eventStalls.id,
        stallCode: schema.stalls.code,
        description: schema.stalls.description,
        tier: schema.eventStalls.tier,
        priceCents: schema.eventStalls.priceCents,
        active: schema.eventStalls.active,
        bookingCount: count(schema.bookings.id),
      })
      .from(schema.eventStalls)
      .innerJoin(schema.stalls, eq(schema.eventStalls.stallId, schema.stalls.id))
      .leftJoin(
        schema.bookings,
        and(eq(schema.bookings.eventStallId, schema.eventStalls.id), eq(schema.bookings.status, 'reserved')),
      )
      .where(eq(schema.eventStalls.eventId, event.id))
      .groupBy(schema.eventStalls.id, schema.stalls.code, schema.stalls.description)
      .orderBy(asc(schema.stalls.code))
      .all()
    return { ...event, inventory }
  })
})

export const createMarketEvent = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      marketDate: string
      label: string
      startTime: string
      endTime: string
      tier?: 'standard' | 'corner' | 'premium'
      priceCents?: number
    }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.marketDate)) throw new Error('Choose a valid market date.')
      if (!/^\d{2}:\d{2}$/.test(data.startTime) || !/^\d{2}:\d{2}$/.test(data.endTime)) {
        throw new Error('Choose valid opening and closing times.')
      }
      if (data.startTime >= data.endTime) throw new Error('Closing time must be after opening time.')
      const tier = data.tier ?? 'standard'
      if (!['standard', 'corner', 'premium'].includes(tier)) throw new Error('Choose a valid pricing tier.')
      const priceCents = data.priceCents ?? 7500
      if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 100_000) {
        throw new Error('Enter a valid stall price.')
      }
      return {
        marketDate: data.marketDate,
        label: checkedText(data.label, 'Market label'),
        startTime: data.startTime,
        endTime: data.endTime,
        tier,
        priceCents,
      }
    },
  )
  .handler(async ({ data }) => {
    
    const database = getDatabase()
    const existing = database
      .select({ id: schema.marketEvents.id })
      .from(schema.marketEvents)
      .where(eq(schema.marketEvents.marketDate, data.marketDate))
      .get()
    if (existing) throw new Error('A market date already exists for that day.')

    const eventId = `market-${data.marketDate}`
    const now = new Date().toISOString()
    const activeStalls = database
      .select()
      .from(schema.stalls)
      .where(eq(schema.stalls.active, true))
      .orderBy(asc(schema.stalls.code))
      .all()

    database.transaction((transaction) => {
      transaction
        .insert(schema.marketEvents)
        .values({
          id: eventId,
          marketDate: data.marketDate,
          label: data.label,
          startTime: data.startTime,
          endTime: data.endTime,
          status: 'open',
          createdAt: now,
        })
        .run()
      transaction
        .insert(schema.eventStalls)
        .values(
          activeStalls.map((stall) => ({
            id: `${eventId}-${stall.id}`,
            eventId,
            stallId: stall.id,
            tier: data.tier,
            priceCents: data.priceCents,
            active: true,
          })),
        )
        .run()
      transaction
        .insert(schema.auditLogs)
        .values({
          id: `audit-${crypto.randomUUID()}`,
          actorKind: 'local-admin',
          actorId: null,
          action: 'market-event.created',
          entityType: 'market-event',
          entityId: eventId,
          summary: `Opened ${data.label} on ${data.marketDate} with ${activeStalls.length} demo stalls.`,
          createdAt: now,
        })
        .run()
    })

    return { eventId }
  })

export const setMarketEventStatus = createServerFn({ method: 'POST' })
  .validator((data: { eventId: string; status: 'open' | 'closed' }) => {
    if (data.status !== 'open' && data.status !== 'closed') throw new Error('Invalid market status.')
    return { eventId: checkedId(data.eventId, 'market-', 'market date'), status: data.status }
  })
  .handler(async ({ data }) => {
    
    const database = getDatabase()
    const event = database
      .select({ id: schema.marketEvents.id })
      .from(schema.marketEvents)
      .where(eq(schema.marketEvents.id, data.eventId))
      .get()
    if (!event) throw new Error('Market date not found.')

    database
      .update(schema.marketEvents)
      .set({ status: data.status })
      .where(eq(schema.marketEvents.id, data.eventId))
      .run()
    return data
  })

export const updateEventStall = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      eventStallId: string
      tier: 'standard' | 'corner' | 'premium'
      priceCents: number
      active: boolean
    }) => {
      if (data.tier !== 'standard' && data.tier !== 'corner' && data.tier !== 'premium') {
        throw new Error('Invalid stall tier.')
      }
      if (!Number.isInteger(data.priceCents) || data.priceCents < 0 || data.priceCents > 100_000) {
        throw new Error('Enter a valid stall price.')
      }
      return {
        eventStallId: checkedId(data.eventStallId, 'market-', 'event stall'),
        tier: data.tier,
        priceCents: data.priceCents,
        active: Boolean(data.active),
      }
    },
  )
  .handler(async ({ data }) => {
    
    const database = getDatabase()
    const eventStall = database
      .select({ id: schema.eventStalls.id })
      .from(schema.eventStalls)
      .where(eq(schema.eventStalls.id, data.eventStallId))
      .get()
    if (!eventStall) throw new Error('Event stall not found.')

    database
      .update(schema.eventStalls)
      .set({ tier: data.tier, priceCents: data.priceCents, active: data.active })
      .where(eq(schema.eventStalls.id, data.eventStallId))
      .run()
    return { eventStallId: data.eventStallId }
  })

export const listAdminBookings = createServerFn({ method: 'GET' }).handler(async () => {
  
  const database = getDatabase()
  const rows = database
    .select({
      id: schema.bookings.id,
      vendorId: schema.bookings.vendorId,
      contactName: schema.vendors.contactName,
      email: schema.vendors.email,
      eventId: schema.marketEvents.id,
      status: schema.bookings.status,
      paymentStatus: schema.bookings.paymentStatus,
      priceCents: schema.bookings.priceCents,
      reservedAt: schema.bookings.reservedAt,
      updatedAt: schema.bookings.updatedAt,
      marketDate: schema.marketEvents.marketDate,
      marketLabel: schema.marketEvents.label,
      stallCode: schema.stalls.code,
      tier: schema.eventStalls.tier,
    })
    .from(schema.bookings)
    .innerJoin(schema.vendors, eq(schema.bookings.vendorId, schema.vendors.id))
    .innerJoin(schema.eventStalls, eq(schema.bookings.eventStallId, schema.eventStalls.id))
    .innerJoin(schema.stalls, eq(schema.eventStalls.stallId, schema.stalls.id))
    .innerJoin(schema.marketEvents, eq(schema.eventStalls.eventId, schema.marketEvents.id))
    .orderBy(desc(schema.bookings.reservedAt))
    .all()

  return rows.map((booking) => {
    const application = database
      .select({
        businessName: schema.vendorApplications.businessName,
        phone: schema.vendorApplications.phone,
      })
      .from(schema.vendorApplications)
      .where(eq(schema.vendorApplications.vendorId, booking.vendorId))
      .orderBy(desc(schema.vendorApplications.revision))
      .limit(1)
      .get()
    return {
      ...booking,
      businessName: application?.businessName ?? booking.contactName,
      phone: application?.phone ?? '—',
    }
  })
})
