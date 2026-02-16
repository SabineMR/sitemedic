/**
 * RiddorSyncAlert Component
 *
 * Critical persistent banner for RIDDOR-reportable incidents that fail to sync.
 *
 * This component alerts the medic when a RIDDOR-reportable incident has failed
 * to sync after multiple retry attempts. RIDDOR incidents are legally required
 * to be reported within specific timeframes, making sync failures critical.
 *
 * Features:
 * - Red background (#FEE2E2) for critical urgency
 * - NON-DISMISSIBLE (no close button) until sync succeeds
 * - Only triggers after 3+ retry attempts (RIDDOR_RETRY_THRESHOLD)
 * - Manual "Sync Now" button with 56pt minimum tap target
 * - Checks queue every 10 seconds for RIDDOR failures
 *
 * Retry threshold rationale:
 * - retryCount 1: first retry after ~30s backoff (likely transient network blip)
 * - retryCount 2: second retry after ~1min backoff (brief outage)
 * - retryCount 3+: third retry after ~2min backoff (sustained failure for ~3.5 mins, warrants critical alert)
 *
 * Design: Per CONTEXT.md success criteria - "RIDDOR failure alerts: Must be critical alert"
 */

import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSync } from '../contexts/SyncContext'
import { syncQueue } from '../services/SyncQueue'

/** RIDDOR alert triggers after this many retry attempts.
 *  At 3 retries with exponential backoff (30s, 1min, 2min),
 *  the item has been failing for ~3.5 minutes. */
const RIDDOR_RETRY_THRESHOLD = 3

export function RiddorSyncAlert() {
  const { state, triggerSync } = useSync()
  const [riddorFailCount, setRiddorFailCount] = useState(0)

  const checkRiddorFailures = useCallback(async () => {
    try {
      const items = await syncQueue.getPendingItems()
      const riddorFailed = items.filter(
        item => item.priority === 0
          && item.retryCount >= RIDDOR_RETRY_THRESHOLD
          && item.tableName !== 'photo_uploads'
      )
      setRiddorFailCount(riddorFailed.length)
    } catch (error) {
      console.error('[RiddorSyncAlert] Failed to check RIDDOR items:', error)
    }
  }, [])

  useEffect(() => {
    checkRiddorFailures()
    // Re-check every 10 seconds
    const interval = setInterval(checkRiddorFailures, 10000)
    return () => clearInterval(interval)
  }, [checkRiddorFailures, state.pendingCount])

  if (riddorFailCount === 0) return null

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>!</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>RIDDOR Report Pending</Text>
        <Text style={styles.message}>
          {riddorFailCount} reportable {riddorFailCount === 1 ? 'incident has' : 'incidents have'} not synced.
          {'\n'}This must be reported. Retrying automatically.
        </Text>
      </View>
      <Pressable
        onPress={triggerSync}
        style={styles.retryButton}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={styles.retryText}>Sync Now</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FEE2E2', // Red background
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444', // Red border
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444', // Red circle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7F1D1D', // Dark red
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#991B1B', // Dark red
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#EF4444', // Red
    borderRadius: 8,
    minHeight: 56, // 56pt minimum tap target
    minWidth: 100,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
})
