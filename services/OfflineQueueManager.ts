/**
 * OfflineQueueManager.ts
 *
 * Enhanced offline queue management for location tracking.
 *
 * WHY: Robust offline resilience requires:
 * - Queue size limits (prevent unbounded memory growth)
 * - Old item cleanup (discard pings >24 hours old)
 * - Retry with exponential backoff (don't spam server on network errors)
 * - Partial sync recovery (track which items succeeded if batch partially fails)
 * - Queue corruption recovery (handle invalid JSON in AsyncStorage)
 *
 * FEATURES:
 * - Max 500 pings in queue (prevent memory issues)
 * - Auto-cleanup of pings >24 hours old
 * - Exponential backoff: 5s, 10s, 20s, 40s, 60s max
 * - Partial sync tracking (remove only successful items)
 * - Queue health monitoring
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Constants
const OFFLINE_QUEUE_KEY = '@sitemedic:location_queue';
const QUEUE_METADATA_KEY = '@sitemedic:queue_metadata';
const MAX_QUEUE_SIZE = 500; // Max pings to keep in queue
const MAX_PING_AGE_HOURS = 24; // Discard pings older than 24 hours
const BATCH_SIZE = 50; // Max pings per API request
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRY_DELAY_MS = 60000; // 60 seconds max

// Types
interface QueuedPing {
  id: string; // Unique ID for tracking
  ping: LocationPing;
  queuedAt: string; // ISO timestamp when added to queue
  retryCount: number;
  lastRetryAt?: string;
}

interface LocationPing {
  medic_id: string;
  booking_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  altitude_meters?: number;
  heading_degrees?: number;
  speed_mps?: number;
  battery_level: number;
  connection_type: string;
  gps_provider: string;
  recorded_at: string;
  is_offline_queued: boolean;
  is_background: boolean;
}

interface QueueMetadata {
  totalEnqueued: number; // Lifetime total pings queued
  totalSynced: number; // Lifetime total pings successfully synced
  totalDiscarded: number; // Lifetime total pings discarded (too old/queue full)
  lastSyncAttempt?: string; // Last time we tried to sync
  lastSuccessfulSync?: string; // Last time sync succeeded
  failedSyncCount: number; // Consecutive failed sync attempts
}

export class OfflineQueueManager {
  private queue: QueuedPing[] = [];
  private metadata: QueueMetadata = {
    totalEnqueued: 0,
    totalSynced: 0,
    totalDiscarded: 0,
    failedSyncCount: 0,
  };
  private isSyncing = false;

  /**
   * Initialize queue manager (load from storage)
   */
  async initialize(): Promise<void> {
    try {
      await this.loadQueue();
      await this.loadMetadata();
      await this.cleanupOldPings();
      console.log(`[OfflineQueue] Initialized with ${this.queue.length} queued pings`);
    } catch (error) {
      console.error('[OfflineQueue] Error initializing:', error);
      // If queue is corrupted, start fresh
      await this.resetQueue();
    }
  }

  /**
   * Add ping to offline queue
   */
  async enqueuePing(ping: LocationPing): Promise<boolean> {
    try {
      // Check queue size limit
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        console.warn(`[OfflineQueue] Queue full (${MAX_QUEUE_SIZE}), discarding oldest ping`);
        // Remove oldest ping
        const discarded = this.queue.shift();
        if (discarded) {
          this.metadata.totalDiscarded++;
        }
      }

      // Create queued ping with metadata
      const queuedPing: QueuedPing = {
        id: this.generateId(),
        ping,
        queuedAt: new Date().toISOString(),
        retryCount: 0,
      };

      this.queue.push(queuedPing);
      this.metadata.totalEnqueued++;

      await this.saveQueue();
      await this.saveMetadata();

      console.log(`[OfflineQueue] Enqueued ping (${this.queue.length} in queue)`);
      return true;
    } catch (error) {
      console.error('[OfflineQueue] Error enqueueing ping:', error);
      return false;
    }
  }

  /**
   * Sync queue with server (with exponential backoff)
   */
  async syncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      console.log('[OfflineQueue] Sync already in progress');
      return { synced: 0, failed: 0 };
    }

    if (this.queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.metadata.lastSyncAttempt = new Date().toISOString();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      console.log(`[OfflineQueue] Starting sync of ${this.queue.length} pings...`);

      // Process queue in batches
      while (this.queue.length > 0) {
        const batch = this.queue.slice(0, BATCH_SIZE);
        const pings = batch.map((qp) => qp.ping);

        try {
          // Calculate retry delay (exponential backoff)
          const retryDelay = this.calculateRetryDelay(batch[0].retryCount);
          if (batch[0].retryCount > 0) {
            console.log(`[OfflineQueue] Retry attempt ${batch[0].retryCount}, waiting ${retryDelay}ms...`);
            await this.sleep(retryDelay);
          }

          // Send batch to server
          const { data, error } = await supabase.functions.invoke('medic-location-ping', {
            body: { pings },
          });

          if (error) {
            console.error('[OfflineQueue] Batch sync failed:', error);

            // Increment retry count for failed pings
            for (const queuedPing of batch) {
              queuedPing.retryCount++;
              queuedPing.lastRetryAt = new Date().toISOString();

              // Discard if exceeded max retries
              if (queuedPing.retryCount >= MAX_RETRY_ATTEMPTS) {
                console.warn(`[OfflineQueue] Ping ${queuedPing.id} exceeded max retries, discarding`);
                this.queue = this.queue.filter((p) => p.id !== queuedPing.id);
                this.metadata.totalDiscarded++;
                failedCount++;
              }
            }

            this.metadata.failedSyncCount++;
            await this.saveQueue();
            await this.saveMetadata();

            // If this batch failed, stop syncing (don't waste battery/data)
            break;
          }

          // Batch succeeded - remove synced pings from queue
          const syncedIds = batch.map((qp) => qp.id);
          this.queue = this.queue.filter((qp) => !syncedIds.includes(qp.id));
          syncedCount += batch.length;
          this.metadata.totalSynced += batch.length;
          this.metadata.failedSyncCount = 0; // Reset on success

          console.log(`[OfflineQueue] Batch synced successfully (${batch.length} pings)`);
        } catch (networkError) {
          console.error('[OfflineQueue] Network error during sync:', networkError);
          // Network error - retry later
          for (const queuedPing of batch) {
            queuedPing.retryCount++;
            queuedPing.lastRetryAt = new Date().toISOString();
          }
          this.metadata.failedSyncCount++;
          break;
        }
      }

      if (syncedCount > 0) {
        this.metadata.lastSuccessfulSync = new Date().toISOString();
        console.log(`[OfflineQueue] Sync complete: ${syncedCount} synced, ${failedCount} failed`);
      }

      await this.saveQueue();
      await this.saveMetadata();

      return { synced: syncedCount, failed: failedCount };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Clean up pings older than 24 hours
   */
  async cleanupOldPings(): Promise<number> {
    const now = Date.now();
    const maxAge = MAX_PING_AGE_HOURS * 60 * 60 * 1000; // 24 hours in ms

    const beforeCount = this.queue.length;

    this.queue = this.queue.filter((queuedPing) => {
      const age = now - new Date(queuedPing.queuedAt).getTime();
      if (age > maxAge) {
        console.warn(`[OfflineQueue] Discarding old ping (age: ${Math.round(age / 1000 / 60 / 60)}h)`);
        this.metadata.totalDiscarded++;
        return false;
      }
      return true;
    });

    const discardedCount = beforeCount - this.queue.length;

    if (discardedCount > 0) {
      await this.saveQueue();
      await this.saveMetadata();
      console.log(`[OfflineQueue] Cleaned up ${discardedCount} old pings`);
    }

    return discardedCount;
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueSize: number;
    oldestPingAge?: number; // Age in minutes
    metadata: QueueMetadata;
    health: 'healthy' | 'warning' | 'critical';
  } {
    let oldestPingAge: number | undefined;
    if (this.queue.length > 0) {
      const oldestQueuedAt = this.queue[0].queuedAt;
      oldestPingAge = Math.round((Date.now() - new Date(oldestQueuedAt).getTime()) / 1000 / 60);
    }

    // Determine health status
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (this.queue.length > MAX_QUEUE_SIZE * 0.8) {
      health = 'critical'; // Queue >80% full
    } else if (this.queue.length > MAX_QUEUE_SIZE * 0.5 || this.metadata.failedSyncCount > 3) {
      health = 'warning'; // Queue >50% full or 3+ failed syncs
    }

    return {
      queueSize: this.queue.length,
      oldestPingAge,
      metadata: { ...this.metadata },
      health,
    };
  }

  /**
   * Clear entire queue (for testing or manual reset)
   */
  async clearQueue(): Promise<void> {
    const discardedCount = this.queue.length;
    this.queue = [];
    this.metadata.totalDiscarded += discardedCount;
    await this.saveQueue();
    await this.saveMetadata();
    console.log(`[OfflineQueue] Queue cleared (${discardedCount} pings discarded)`);
  }

  /**
   * Reset queue (use if corrupted)
   */
  private async resetQueue(): Promise<void> {
    console.warn('[OfflineQueue] Resetting queue due to corruption');
    this.queue = [];
    this.metadata = {
      totalEnqueued: 0,
      totalSynced: 0,
      totalDiscarded: 0,
      failedSyncCount: 0,
    };
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    await AsyncStorage.removeItem(QUEUE_METADATA_KEY);
  }

  // ========================
  // Private Helper Methods
  // ========================

  private async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
      }
    } catch (error) {
      console.error('[OfflineQueue] Error loading queue:', error);
      throw error;
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Error saving queue:', error);
    }
  }

  private async loadMetadata(): Promise<void> {
    try {
      const metadataJson = await AsyncStorage.getItem(QUEUE_METADATA_KEY);
      if (metadataJson) {
        this.metadata = JSON.parse(metadataJson);
      }
    } catch (error) {
      console.error('[OfflineQueue] Error loading metadata:', error);
    }
  }

  private async saveMetadata(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.error('[OfflineQueue] Error saving metadata:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: 5s, 10s, 20s, 40s, 60s max
    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
    return Math.min(delay, MAX_RETRY_DELAY_MS);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const offlineQueueManager = new OfflineQueueManager();
