/**
 * PhotoUploadProgress Component
 *
 * Aggregate photo upload indicator for sync status.
 *
 * Shows when photos are pending upload with a simple count and progress indicator.
 * Displays logical photo count (queue items / 3 stages) rather than raw queue items
 * to avoid confusing medics with implementation details.
 *
 * Features:
 * - Light blue background (#EFF6FF) for non-intrusive notification
 * - Aggregate count (not per-photo spam) per Research Pitfall 6
 * - Shows logical photo count (divides queue items by 3 stages per photo)
 * - Auto-dismisses when all photos uploaded
 *
 * Design: Compact bar that fits below SyncStatusIndicator
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useSync } from '../contexts/SyncContext'

export function PhotoUploadProgress() {
  const { state } = useSync()

  if (state.pendingPhotoCount === 0) return null

  // Each photo has 3 stages (thumbnail, preview, full)
  // Show logical photo count, not queue item count
  const logicalPhotoCount = Math.ceil(state.pendingPhotoCount / 3)

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        Uploading {logicalPhotoCount} {logicalPhotoCount === 1 ? 'photo' : 'photos'}...
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF', // Light blue background
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6', // Blue
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    color: '#1D4ED8', // Dark blue
    fontWeight: '500',
  },
})
