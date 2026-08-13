import { and, eq, or } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { openDatabase } from './driver'
import * as schema from './schema'

const dataDirectory = resolve(process.cwd(), process.env.KBCC_DATA_DIR ?? '.data')
const databasePath = resolve(dataDirectory, 'key-biscayne.sqlite')
const migrationsPath = resolve(process.cwd(), 'drizzle')

mkdirSync(dataDirectory, { recursive: true })

const { database, migrateDatabase } = openDatabase(databasePath, schema)
let initialized = false
const standardDescription =
  'A classic 10×10 spot along the main row of the plaza with great foot traffic all morning.'
const cornerDescription =
  'A corner location with two open sides — extra visibility and room to display your goods.'
const premiumDescription =
  'Our largest, best-positioned spot near the plaza entrance with maximum exposure.'

const plazaStalls = [
  { code: 'A1', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'A2', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'A3', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'A4', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'B1', tier: 'premium', priceCents: 14500, description: premiumDescription },
  { code: 'B2', tier: 'premium', priceCents: 14500, description: premiumDescription },
  { code: 'B3', tier: 'premium', priceCents: 14500, description: premiumDescription },
  { code: 'B4', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'C1', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'C2', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'C3', tier: 'corner', priceCents: 11000, description: cornerDescription },
  { code: 'C4', tier: 'corner', priceCents: 11000, description: cornerDescription },
  { code: 'D1', tier: 'premium', priceCents: 14500, description: premiumDescription },
  { code: 'D2', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'D3', tier: 'standard', priceCents: 7500, description: standardDescription },
  { code: 'D4', tier: 'corner', priceCents: 11000, description: cornerDescription },
] as const

const plazaSeedAuditId = 'audit-local-plaza-map-v1'


function upcomingSaturdays(amount: number) {
  const dates: Array<string> = []
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  const daysUntilNextSaturday = ((6 - cursor.getDay() + 7) % 7) || 7
  cursor.setDate(cursor.getDate() + daysUntilNextSaturday)

  for (let index = 0; index < amount; index += 1) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 7)
  }

  return dates
}

function seedLocalMarket() {
  const disconnectedMapDescription =
    'A 10 × 10 demo stall. The final plaza diagram and geometry are not connected yet.'
  const genericPlazaDescription = 'A 10 × 10 market stall on the church plaza.'
  const createdAt = new Date().toISOString()
  const existingEvents = database.select({ id: schema.marketEvents.id }).from(schema.marketEvents).all()
  const plazaSeedApplied = database
    .select({ id: schema.auditLogs.id })
    .from(schema.auditLogs)
    .where(eq(schema.auditLogs.id, plazaSeedAuditId))
    .get()

  if (existingEvents.length > 0 && plazaSeedApplied) return

  database.transaction((transaction) => {
    for (const stall of plazaStalls) {
      const stallId = `stall-${stall.code.toLowerCase()}`
      transaction
        .insert(schema.stalls)
        .values({ id: stallId, code: stall.code, description: stall.description, active: true })
        .onConflictDoNothing()
        .run()
      transaction
        .update(schema.stalls)
        .set({ description: stall.description })
        .where(
          and(
            eq(schema.stalls.id, stallId),
            or(
              eq(schema.stalls.description, disconnectedMapDescription),
              eq(schema.stalls.description, genericPlazaDescription),
            ),
          ),
        )
        .run()
    }

    const marketEvents =
      existingEvents.length > 0
        ? existingEvents
        : upcomingSaturdays(3).map((marketDate) => {
            const eventId = `market-${marketDate}`
            transaction
              .insert(schema.marketEvents)
              .values({
                id: eventId,
                marketDate,
                label: 'Saturday Farmers Market',
                startTime: '09:00',
                endTime: '12:00',
                status: 'open',
                createdAt,
              })
              .run()
            return { id: eventId }
          })

    for (const event of marketEvents) {
      for (const stall of plazaStalls) {
        const eventStallId = `${event.id}-stall-${stall.code.toLowerCase()}`
        transaction
          .insert(schema.eventStalls)
          .values({
            id: eventStallId,
            eventId: event.id,
            stallId: `stall-${stall.code.toLowerCase()}`,
            tier: stall.tier,
            priceCents: stall.priceCents,
            active: true,
          })
          .onConflictDoNothing()
          .run()

        if (stall.tier !== 'standard') {
          transaction
            .update(schema.eventStalls)
            .set({ tier: stall.tier, priceCents: stall.priceCents })
            .where(
              and(
                eq(schema.eventStalls.id, eventStallId),
                eq(schema.eventStalls.tier, 'standard'),
                eq(schema.eventStalls.priceCents, 7500),
              ),
            )
            .run()
        }
      }
    }

    transaction
      .insert(schema.auditLogs)
      .values({
        id: plazaSeedAuditId,
        actorKind: 'system',
        actorId: null,
        action: 'local-plaza-map-seed',
        entityType: 'stall-map',
        entityId: 'figma-plaza',
        summary: 'Aligned local demo inventory with the supplied plaza map.',
        createdAt,
      })
      .onConflictDoNothing()
      .run()
  })
}

export function getDatabase() {
  if (!initialized) {
    migrateDatabase(migrationsPath)
    seedLocalMarket()
    initialized = true
  }

  return database
}

export function getDataDirectory() {
  getDatabase()
  return dataDirectory
}

export function assertVendorExists(vendorId: string) {
  const vendor = getDatabase().select().from(schema.vendors).where(eq(schema.vendors.id, vendorId)).get()
  if (!vendor) throw new Error('This local vendor profile no longer exists. Start a new demo profile.')
  return vendor
}
