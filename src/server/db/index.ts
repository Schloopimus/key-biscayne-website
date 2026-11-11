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

export function getDatabase() {
  if (!initialized) {
    migrateDatabase(migrationsPath)
    initialized = true
  }

  return database
}

export function getDataDirectory() {
  getDatabase()
  return dataDirectory
}
