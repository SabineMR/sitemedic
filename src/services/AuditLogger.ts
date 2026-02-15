/**
 * AuditLogger Service
 *
 * Client-side audit logging for GDPR Article 30 compliance.
 *
 * PURPOSE:
 * Server-side PostgreSQL triggers (from Plan 01-02) capture INSERT/UPDATE/DELETE
 * on Supabase tables, but READ operations on sensitive health data happen locally
 * in WatermelonDB and are invisible to the server. This service fills that gap.
 *
 * FEATURES:
 * - Records all READ operations on sensitive tables (workers, treatments, etc.)
 * - Logs user_id, table_name, record_id, operation, context to local audit_log table
 * - Batch-syncs unsynced entries to Supabase at low priority (never blocks clinical data)
 * - Writes are local-only (fast), sync happens in background
 * - Respects user logout (no-op when not authenticated)
 *
 * GDPR COMPLIANCE:
 * - Article 30: Records of processing activities
 * - Article 5(2): Accountability (demonstrable compliance)
 * - Context field explains WHY data was accessed (e.g., 'emergency_lookup', 'treatment_history')
 *
 * INTEGRATION:
 * Phase 2+ data access screens call auditLogger.logAccess() when loading sensitive data.
 * Example: Treatment detail screen → auditLogger.logAccess('treatments', id, 'READ', 'treatment_detail')
 */

import { getDatabase } from '../lib/watermelon'
import { syncQueue } from './SyncQueue'
import AuditLogEntry from '../database/models/AuditLogEntry'
import { Q } from '@nozbe/watermelondb'

// Only audit access to sensitive health data tables
const SENSITIVE_TABLES = ['workers', 'treatments', 'near_misses', 'safety_checks']

export class AuditLogger {
  private currentUserId: string | null = null

  /**
   * Set the current authenticated user ID.
   * Called from AuthProvider on login/logout.
   * When userId is null (logged out), subsequent logAccess calls are no-ops.
   *
   * @param userId - Supabase user UUID or null if logged out
   */
  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId
    console.log(`[AuditLogger] Current user set:`, userId ? userId.substring(0, 8) + '...' : 'null')
  }

  /**
   * Log data access to local audit_log table.
   * Only logs access to SENSITIVE_TABLES.
   * Fast local write (no network call).
   *
   * @param tableName - Which table was accessed (e.g., 'workers', 'treatments')
   * @param recordId - WatermelonDB ID of accessed record
   * @param operation - Type of operation ('READ', 'CREATE', 'UPDATE', 'DELETE')
   * @param context - Why the access happened (e.g., 'worker_profile_view', 'emergency_lookup')
   */
  async logAccess(
    tableName: string,
    recordId: string,
    operation: string,
    context?: string
  ): Promise<void> {
    // Guard: Not logged in
    if (!this.currentUserId) {
      return // No-op when logged out
    }

    // Guard: Not a sensitive table
    if (!SENSITIVE_TABLES.includes(tableName)) {
      return // Only audit sensitive data
    }

    const database = getDatabase()

    try {
      await database.write(async () => {
        await database.collections.get<AuditLogEntry>('audit_log').create((entry) => {
          entry.userId = this.currentUserId!
          entry.tableName = tableName
          entry.recordId = recordId
          entry.operation = operation
          entry.context = context || ''
          entry.synced = false
          entry.createdAt = Date.now()
        })
      })

      console.log(`[AuditLogger] Logged: ${operation} ${tableName}/${recordId} (${context || 'no context'})`)
    } catch (error) {
      console.error('[AuditLogger] Failed to log access:', error)
      // Don't throw—audit logging failure shouldn't break app functionality
    }
  }

  /**
   * Batch-sync unsynced audit log entries to Supabase.
   * Processes up to 50 entries at a time.
   * Uses sync queue priority 2 (lower than RIDDOR=0 and normal data=1).
   *
   * This method is called:
   * - Periodically by SyncContext (e.g., every 5 minutes)
   * - When device comes back online
   * - Before user logout (ensure all audit logs synced)
   *
   * @returns Count of entries synced
   */
  async syncPendingAuditLogs(): Promise<number> {
    const database = getDatabase()

    try {
      // Query up to 50 unsynced entries (oldest first)
      const unsyncedEntries = await database.collections
        .get<AuditLogEntry>('audit_log')
        .query(
          Q.where('synced', false),
          Q.sortBy('created_at', Q.asc),
          Q.take(50) // Batch size limit
        )
        .fetch()

      if (unsyncedEntries.length === 0) {
        return 0
      }

      console.log(`[AuditLogger] Syncing ${unsyncedEntries.length} audit log entries...`)

      // Get org_id from auth (assuming it's in the user's JWT/profile)
      // For now, use a placeholder—will be populated from auth context in Phase 2
      // TODO: Read org_id from user profile/JWT in AuthContext
      const orgId = '00000000-0000-0000-0000-000000000000' // Placeholder

      // Convert to Supabase-compatible payload
      const batchPayload = unsyncedEntries.map((entry) => ({
        table_name: entry.tableName,
        record_id: entry.recordId,
        operation: entry.operation,
        user_id: entry.userId,
        org_id: orgId,
        changed_fields: null, // Client-side reads don't modify data
        ip_address: null, // Mobile app doesn't have IP address
        created_at: new Date(entry.createdAt).toISOString(),
      }))

      // Enqueue as a single batch operation
      // Use a synthetic batchId for sync queue tracking
      const batchId = `audit_batch_${Date.now()}`

      await syncQueue.enqueue(
        'create',
        'audit_logs', // Supabase table name
        batchId,
        batchPayload,
        2 // Priority 2 (lower than RIDDOR=0, normal=1)
      )

      // Mark entries as synced
      await database.write(async () => {
        for (const entry of unsyncedEntries) {
          await entry.update((record) => {
            record.synced = true
          })
        }
      })

      console.log(`[AuditLogger] Enqueued ${unsyncedEntries.length} audit entries for sync`)

      return unsyncedEntries.length
    } catch (error) {
      console.error('[AuditLogger] Failed to sync audit logs:', error)
      return 0
    }
  }

  /**
   * Get count of unsynced audit log entries.
   * Used by UI to show pending audit logs status.
   */
  async getUnsyncedCount(): Promise<number> {
    const database = getDatabase()
    const count = await database.collections
      .get<AuditLogEntry>('audit_log')
      .query(Q.where('synced', false))
      .fetchCount()
    return count
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger()
