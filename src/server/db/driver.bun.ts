import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import type * as schemaDefinition from './schema'

export function openDatabase(path: string, schema: typeof schemaDefinition) {
  const client = new Database(path, { create: true })
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
