/**
 * OfflineBanner Component
 *
 * Yellow/amber banner shown when device loses connectivity.
 *
 * Features:
 * - Only renders when offline
 * - Fixed position at top (below status bar)
 * - Dismissible, but re-shows if still offline after 30 seconds
 * - Reassuring message: changes saved locally, will sync when connected
 * - High visibility color (amber/yellow)
 *
 * Design: Critical for construction site UX where connectivity is unreliable
 */

import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSync } from '../contexts/SyncContext'

export function OfflineBanner() {
  const { state } = useSync()
  const [isDismissed, setIsDismissed] = useState(false)
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset dismissal when coming back online
  useEffect(() => {
    if (state.isOnline) {
      setIsDismissed(false)
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current)
        dismissTimeoutRef.current = null
      }
    }
  }, [state.isOnline])

  // Auto-show again after 30 seconds if still offline
  useEffect(() => {
    if (isDismissed && !state.isOnline) {
      dismissTimeoutRef.current = setTimeout(() => {
        setIsDismissed(false)
      }, 30000) // 30 seconds

      return () => {
        if (dismissTimeoutRef.current) {
          clearTimeout(dismissTimeoutRef.current)
        }
      }
    }
  }, [isDismissed, state.isOnline])

  // Don't render if online or dismissed
  if (state.isOnline || isDismissed) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.message}>
          You're offline. Changes are saved locally and will sync when connected.
        </Text>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => setIsDismissed(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7', // Amber/yellow background (high visibility)
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E', // Dark amber text (high contrast)
    lineHeight: 20,
  },
  dismissButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dismissText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#92400E',
  },
})
