import { count, eq } from 'drizzle-orm'
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
  const plazaStallDescription = 'A 10 × 10 market stall on the church plaza.'
  database
    .update(schema.stalls)
    .set({ description: plazaStallDescription })
    .where(eq(schema.stalls.description, disconnectedMapDescription))
    .run()

  const existingEvents = database.select({ value: count() }).from(schema.marketEvents).get()?.value ?? 0
  if (existingEvents > 0) return

  const createdAt = new Date().toISOString()
  const stallCodes = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4']
  const stallRows = stallCodes.map((code) => ({
    id: `stall-${code.toLowerCase()}`,
    code,
    description: plazaStallDescription,
    active: true,
  }))

  database.transaction((transaction) => {
    transaction.insert(schema.stalls).values(stallRows).run()

    for (const marketDate of upcomingSaturdays(3)) {
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

      transaction
        .insert(schema.eventStalls)
        .values(
          stallRows.map((stall) => ({
            id: `${eventId}-${stall.id}`,
            eventId,
            stallId: stall.id,
            tier: 'standard' as const,
            priceCents: 7500,
            active: true,
          })),
        )
        .run()
    }
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
