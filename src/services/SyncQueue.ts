/**
 * SyncQueue Service
 *
 * Persistent sync queue with exponential backoff for offline-first architecture.
 *
 * Features:
 * - Persists pending operations in WatermelonDB SQLite (survives force-quit)
 * - Exponential backoff for retries (5min → 15min → 1hr → 4hr max)
 * - Priority queue (0 = RIDDOR immediate, 1 = normal, 2 = audit logs low priority)
 * - Automatically triggers sync when coming back online
 * - Updates local server_id after successful sync
 *
 * Design Pattern: Pattern 5 from Research (Sync Queue with Persistent Storage)
 * Critical Pitfall Mitigation: Pitfall 6 (in-memory queue data loss on force-quit)
 */

import { getDatabase } from '../lib/watermelon'
import { Q } from '@nozbe/watermelondb'
import { supabase } from '../lib/supabase'
import NetInfo from '@react-native-community/netinfo'
import SyncQueueItem from '../database/models/SyncQueueItem'

export class SyncQueue {
  private isProcessing = false

  /**
   * Enqueue a sync operation (create, update, delete).
   * Writes to WatermelonDB sync_queue table for persistence across app restarts.
   *
   * @param operation - Type of operation: 'create', 'update', 'delete'
   * @param tableName - Target Supabase table name
   * @param recordId - Local WatermelonDB record ID
   * @param payload - Data to sync (will be JSON stringified)
   * @param priority - 0 = RIDDOR immediate, 1 = normal, 2 = audit logs (default: 1)
   */
  async enqueue(
    operation: 'create' | 'update' | 'delete',
    tableName: string,
    recordId: string,
    payload: any,
    priority: number = 1
  ): Promise<void> {
    const database = getDatabase()

    await database.write(async () => {
      await database.collections.get<SyncQueueItem>('sync_queue').create((item) => {
        item.operation = operation
        item.tableName = tableName
        item.recordId = recordId
        item.payload = JSON.stringify(payload)
        item.priority = priority
        item.retryCount = 0
        item.nextRetryAt = Date.now() // Immediate first attempt
        item.createdAt = Date.now()
      })
    })

    // Trigger sync if online
    const netState = await NetInfo.fetch()
    if (netState.isConnected) {
      this.processPendingItems()
    }
  }

  /**
   * Process all pending items in the sync queue.
   * Uses exponential backoff for failed items.
   * Guard against concurrent processing.
   *
   * @returns Object with counts of processed and failed items
   */
  async processPendingItems(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 }
    }

    this.isProcessing = true
    let processed = 0
    let failed = 0

    try {
      const database = getDatabase()
      const now = Date.now()

      // Query items ready for retry (nextRetryAt <= now), sorted by priority
      const pendingItems = await database.collections
        .get<SyncQueueItem>('sync_queue')
        .query(
          Q.where('next_retry_at', Q.lte(now)),
          Q.sortBy('priority', Q.asc), // RIDDOR (0) first, then normal (1), then audit (2)
          Q.sortBy('created_at', Q.asc) // Oldest first within priority level
        )
        .fetch()

      for (const item of pendingItems) {
        try {
          await this.syncItem(item)
          // Success—remove from queue
          await database.write(async () => {
            await item.destroyPermanently()
          })
          processed++
        } catch (error) {
          console.error(`Sync failed for ${item.tableName} ${item.recordId}:`, error)
          // Failed—update retry with exponential backoff
          await this.scheduleRetry(item)
          failed++
        }
      }
    } finally {
      this.isProcessing = false
    }

    return { processed, failed }
  }

  /**
   * Get count of pending items in sync queue.
   * Used by UI to show badge count.
   */
  async getPendingCount(): Promise<number> {
    const database = getDatabase()
    const count = await database.collections.get<SyncQueueItem>('sync_queue').query().fetchCount()
    return count
  }

  /**
   * Get all pending items for UI display.
   * Returns items sorted by priority and creation time.
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    const database = getDatabase()
    const items = await database.collections
      .get<SyncQueueItem>('sync_queue')
      .query(
        Q.sortBy('priority', Q.asc),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch()
    return items
  }

  /**
   * Schedule retry with exponential backoff.
   * Backoff formula: Math.min(5 * 2^retryCount, 240) minutes
   *
   * Retry schedule:
   * - Retry 0 → 1: 5 minutes
   * - Retry 1 → 2: 10 minutes
   * - Retry 2 → 3: 20 minutes
   * - Retry 3 → 4: 40 minutes
   * - Retry 4 → 5: 80 minutes
   * - Retry 5 → 6: 160 minutes
   * - Retry 6+: 240 minutes (4 hour cap)
   */
  private async scheduleRetry(item: SyncQueueItem): Promise<void> {
    const database = getDatabase()
    const retryCount = item.retryCount + 1
    const backoffMinutes = Math.min(5 * Math.pow(2, retryCount), 240) // Max 4 hours
    const nextRetryAt = Date.now() + backoffMinutes * 60 * 1000

    await database.write(async () => {
      await item.update((record) => {
        record.retryCount = retryCount
        record.nextRetryAt = nextRetryAt
      })
    })
  }

  /**
   * Sync a single item to Supabase.
   * Handles create, update, delete operations.
   * Updates local server_id after successful create.
   *
   * @throws Error if sync fails (triggers retry logic)
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload)

    switch (item.operation) {
      case 'create': {
        const { data, error } = await supabase.from(item.tableName as any).insert(payload).select()
        if (error) throw error

        // Update local WatermelonDB record's server_id with returned UUID
        if (data && data.length > 0) {
          const serverId = (data[0] as any).id
          const database = getDatabase()
          const localRecord = await database.collections
            .get(item.tableName)
            .find(item.recordId)

          await database.write(async () => {
            await localRecord.update((record: any) => {
              record.serverId = serverId
            })
          })
        }
        break
      }

      case 'update': {
        const { error } = await supabase
          .from(item.tableName as any)
          .update(payload as any)
          .eq('id', payload.id as any)

        if (error) throw error
        break
      }

      case 'delete': {
        const { error } = await supabase
          .from(item.tableName as any)
          .delete()
          .eq('id', payload.id as any)

        if (error) throw error
        break
      }

      default:
        throw new Error(`Unknown operation: ${item.operation}`)
    }
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue()
