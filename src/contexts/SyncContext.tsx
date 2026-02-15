/**
 * SyncContext
 *
 * React Context for sync state across all components.
 *
 * Provides:
 * - Real-time sync status (synced, syncing, pending, offline, error)
 * - Pending item count for UI badge
 * - Online/offline connectivity state
 * - Manual sync trigger
 * - Sync queue enqueue method for components
 *
 * Integrates:
 * - NetworkMonitor for connectivity detection
 * - SyncQueue for pending operations
 * - AuditLogger for GDPR audit log sync
 * - AuthContext for current user (sets audit logger user)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { networkMonitor } from '../services/NetworkMonitor'
import { syncQueue } from '../services/SyncQueue'
import { auditLogger } from '../services/AuditLogger'
import { useAuth } from './AuthContext'

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  pendingCount: number
  isOnline: boolean
  connectionType: string
  lastSyncAt: Date | null
  lastError: string | null
}

export interface SyncContextType {
  state: SyncState
  triggerSync: () => Promise<void>
  enqueueSyncItem: (
    operation: 'create' | 'update' | 'delete',
    tableName: string,
    recordId: string,
    payload: any,
    priority?: number
  ) => Promise<void>
}

const SyncContext = createContext<SyncContextType | undefined>(undefined)

interface SyncProviderProps {
  children: ReactNode
}

export function SyncProvider({ children }: SyncProviderProps) {
  const auth = useAuth()

  const [state, setState] = useState<SyncState>({
    status: 'synced',
    pendingCount: 0,
    isOnline: true,
    connectionType: 'unknown',
    lastSyncAt: null,
    lastError: null,
  })

  const [isProcessing, setIsProcessing] = useState(false)

  /**
   * Update sync status based on current state.
   * Priority: offline > syncing > error > pending > synced
   */
  const updateStatus = useCallback((
    isOnline: boolean,
    pendingCount: number,
    processing: boolean,
    error: string | null
  ): SyncStatus => {
    if (!isOnline) return 'offline'
    if (processing) return 'syncing'
    if (error) return 'error'
    if (pendingCount > 0) return 'pending'
    return 'synced'
  }, [])

  /**
   * Refresh pending count and update status.
   */
  const refreshState = useCallback(async () => {
    try {
      const pendingCount = await syncQueue.getPendingCount()
      const connectionInfo = networkMonitor.getConnectionInfo()

      setState((prev) => ({
        ...prev,
        pendingCount,
        isOnline: connectionInfo.isOnline,
        connectionType: connectionInfo.connectionType,
        status: updateStatus(connectionInfo.isOnline, pendingCount, isProcessing, prev.lastError),
      }))
    } catch (error) {
      console.error('[SyncContext] Failed to refresh state:', error)
    }
  }, [isProcessing, updateStatus])

  /**
   * Trigger manual sync (both sync queue and audit logs).
   */
  const triggerSync = useCallback(async () => {
    if (!state.isOnline) {
      console.log('[SyncContext] Cannot sync while offline')
      return
    }

    setIsProcessing(true)
    setState((prev) => ({ ...prev, status: 'syncing', lastError: null }))

    try {
      // Sync pending data operations
      const syncResult = await syncQueue.processPendingItems()
      console.log('[SyncContext] Sync result:', syncResult)

      // Sync pending audit logs
      const auditCount = await auditLogger.syncPendingAuditLogs()
      console.log('[SyncContext] Synced audit logs:', auditCount)

      setState((prev) => ({
        ...prev,
        lastSyncAt: new Date(),
        lastError: null,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      console.error('[SyncContext] Sync failed:', errorMessage)
      setState((prev) => ({
        ...prev,
        lastError: errorMessage,
      }))
    } finally {
      setIsProcessing(false)
      // Refresh state after sync completes
      await refreshState()
    }
  }, [state.isOnline, refreshState])

  /**
   * Enqueue a sync item (wrapper for components).
   */
  const enqueueSyncItem = useCallback(async (
    operation: 'create' | 'update' | 'delete',
    tableName: string,
    recordId: string,
    payload: any,
    priority: number = 1
  ) => {
    await syncQueue.enqueue(operation, tableName, recordId, payload, priority)
    await refreshState()
  }, [refreshState])

  /**
   * Initialize network monitoring and periodic state refresh.
   */
  useEffect(() => {
    console.log('[SyncContext] Initializing...')

    // Start network monitoring
    networkMonitor.startMonitoring()

    // Listen for connectivity changes
    const unsubscribe = networkMonitor.addListener((isOnline, connectionType) => {
      console.log('[SyncContext] Connectivity changed:', { isOnline, connectionType })
      setState((prev) => ({
        ...prev,
        isOnline,
        connectionType,
        status: updateStatus(isOnline, prev.pendingCount, isProcessing, prev.lastError),
      }))

      // Refresh state when coming back online
      if (isOnline) {
        refreshState()
      }
    })

    // Initial state refresh
    refreshState()

    // Poll pending count every 10 seconds
    const pollInterval = setInterval(() => {
      refreshState()
    }, 10000)

    // Cleanup
    return () => {
      console.log('[SyncContext] Cleaning up...')
      unsubscribe()
      networkMonitor.stopMonitoring()
      clearInterval(pollInterval)
    }
  }, [isProcessing, updateStatus, refreshState])

  /**
   * Set audit logger's current user when auth state changes.
   */
  useEffect(() => {
    if (auth.state.user) {
      auditLogger.setCurrentUser(auth.state.user.id)
    } else {
      auditLogger.setCurrentUser(null)
    }
  }, [auth.state.user])

  const value: SyncContextType = {
    state,
    triggerSync,
    enqueueSyncItem,
  }

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

/**
 * Hook to access sync context.
 * Must be used within SyncProvider.
 */
export function useSync(): SyncContextType {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within SyncProvider')
  }
  return context
}
