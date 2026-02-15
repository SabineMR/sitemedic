/**
 * NetworkMonitor Service
 *
 * Real-time network connectivity detection and sync triggering.
 *
 * Features:
 * - Detects online/offline transitions in real time
 * - Triggers sync queue processing when connectivity restored
 * - WiFi detection for Phase 3 photo sync constraint
 * - Reachability test to Supabase URL (confirms actual internet access)
 * - Listener pattern for UI components to react to connectivity changes
 *
 * Design Pattern: Research network-aware pattern with NetInfo
 */

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo'
import { syncQueue } from './SyncQueue'

export class NetworkMonitor {
  private unsubscribe: (() => void) | null = null
  private listeners: Set<(isOnline: boolean, connectionType: string) => void> = new Set()

  public isOnline: boolean = true
  public connectionType: string = 'unknown'

  /**
   * Start monitoring network connectivity.
   * Configures reachability test to Supabase URL.
   */
  startMonitoring(): void {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL

    if (!supabaseUrl) {
      console.warn('EXPO_PUBLIC_SUPABASE_URL not set, skipping reachability configuration')
    } else {
      // Configure reachability test to ping Supabase REST API
      NetInfo.configure({
        reachabilityUrl: `${supabaseUrl}/rest/v1/`,
        reachabilityTest: async (response) => response.status === 200,
        reachabilityShortTimeout: 5 * 1000, // 5 seconds
        reachabilityLongTimeout: 60 * 1000, // 60 seconds
      })
    }

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline
      const previousConnectionType = this.connectionType

      // Update state
      this.isOnline = state.isConnected ?? false
      this.connectionType = state.type || 'unknown'

      // Log state change
      console.log('[NetworkMonitor] State change:', {
        isOnline: this.isOnline,
        connectionType: this.connectionType,
        isInternetReachable: state.isInternetReachable,
      })

      // Detect transitions
      if (!wasOnline && this.isOnline) {
        // Transitioned to online
        this.onConnected()
      } else if (wasOnline && !this.isOnline) {
        // Transitioned to offline
        this.onDisconnected()
      }

      // Notify listeners (for UI updates)
      this.listeners.forEach((listener) => {
        listener(this.isOnline, this.connectionType)
      })
    })

    console.log('[NetworkMonitor] Started monitoring')
  }

  /**
   * Stop monitoring network connectivity.
   * Cleans up NetInfo subscription.
   */
  stopMonitoring(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
      console.log('[NetworkMonitor] Stopped monitoring')
    }
  }

  /**
   * Add listener for connectivity changes.
   * Returns unsubscribe function.
   *
   * @param callback - Function called with (isOnline, connectionType)
   * @returns Unsubscribe function
   */
  addListener(callback: (isOnline: boolean, connectionType: string) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Get current connection info.
   * Useful for one-off checks without adding a listener.
   */
  getConnectionInfo(): { isOnline: boolean; connectionType: string; isWifi: boolean } {
    return {
      isOnline: this.isOnline,
      connectionType: this.connectionType,
      isWifi: this.connectionType === 'wifi',
    }
  }

  /**
   * Called when device transitions to online.
   * Triggers sync queue processing.
   */
  private onConnected(): void {
    console.log('[NetworkMonitor] Network connected — triggering sync')
    // Trigger sync queue processing (async, no need to await)
    syncQueue.processPendingItems().then((result) => {
      console.log('[NetworkMonitor] Sync completed:', result)
    }).catch((error) => {
      console.error('[NetworkMonitor] Sync failed:', error)
    })
  }

  /**
   * Called when device transitions to offline.
   * Logs the transition for debugging.
   */
  private onDisconnected(): void {
    console.log('[NetworkMonitor] Network disconnected — entering offline mode')
  }
}

// Export singleton instance
export const networkMonitor = new NetworkMonitor()
