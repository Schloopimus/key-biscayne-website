import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type * as schemaDefinition from './schema'

export function openDatabase(path: string, schema: typeof schemaDefinition) {
  const client = new Database(path)
  client.exec('PRAGMA journal_mode = WAL;')
  client.exec('PRAGMA foreign_keys = ON;')
  client.exec('PRAGMA busy_timeout = 5000;')

  const database = drizzle({ client, schema })
  return {
    database,
    migrateDatabase(migrationsFolder: string) {
      migrate(database, { migrationsFolder })
    },
  }
}
