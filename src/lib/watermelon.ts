import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from '../database/schema'
import migrations from '../database/migrations'
import { modelClasses } from '../database/models'
import { getOrCreateEncryptionKey } from './encryption'

let database: Database | null = null

/**
 * Initialize WatermelonDB database with all model classes.
 * Generates and stores encryption key in iOS Keychain (ready for Phase 2 SQLCipher).
 */
export async function initDatabase(): Promise<Database> {
  // Ensure encryption key exists in iOS Keychain (ready for Phase 2 SQLCipher integration)
  await getOrCreateEncryptionKey()

  // Create SQLite adapter
  const adapter = new SQLiteAdapter({
    schema,
    migrations,
    jsi: true, // Enabled - JSI provides better performance
    // NOTE: encryptionKey will be passed here once SQLCipher integration is ready (Phase 2)
    // WatermelonDB's SQLCipher support is not yet merged (PR #907)
  })

  // Create database instance with all 6 model classes (including AuditLogEntry)
  database = new Database({
    adapter,
    modelClasses,
  })

  return database
}

/**
 * Get the initialized database instance.
 * Throws error if called before initDatabase().
 */
export function getDatabase(): Database {
  if (!database) {
    throw new Error(
      'Database not initialized. Call initDatabase() first.'
    )
  }
  return database
}
