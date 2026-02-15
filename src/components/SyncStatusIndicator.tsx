/**
 * SyncStatusIndicator Component
 *
 * Visual sync status indicator with color-coded states and pending count badge.
 *
 * States:
 * - Synced (green): All data synced to server
 * - Syncing (blue, pulsing): Sync in progress
 * - Pending (orange): Items waiting to sync
 * - Offline (red): No network connectivity
 * - Error (red with exclamation): Sync failed
 *
 * Features:
 * - 48x48pt minimum touch target (gloves-on usability)
 * - High contrast colors for bright sunlight readability
 * - Pending count badge when items queued
 * - OnPress triggers manual sync retry for pending/error states
 * - Pulse animation for syncing state
 *
 * Design: Follows Research ARCH-06 (multi-modal sync status indicators)
 */

import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { useSync } from '../contexts/SyncContext'

export function SyncStatusIndicator() {
  const { state, triggerSync } = useSync()
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulse animation for syncing state
  useEffect(() => {
    if (state.status === 'syncing') {
      // Start pulsing animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      // Reset to normal size
      pulseAnim.setValue(1)
    }
  }, [state.status, pulseAnim])

  // Color mapping
  const getStatusColor = (): string => {
    switch (state.status) {
      case 'synced':
        return '#22C55E' // Green
      case 'syncing':
        return '#3B82F6' // Blue
      case 'pending':
        return '#F59E0B' // Orange
      case 'offline':
        return '#EF4444' // Red
      case 'error':
        return '#EF4444' // Red
      default:
        return '#9CA3AF' // Gray
    }
  }

  // Label mapping
  const getStatusLabel = (): string => {
    switch (state.status) {
      case 'synced':
        return 'Synced'
      case 'syncing':
        return 'Syncing...'
      case 'pending':
        return `${state.pendingCount} pending`
      case 'offline':
        return 'Offline'
      case 'error':
        return 'Sync error'
      default:
        return 'Unknown'
    }
  }

  // Handle press: manual sync retry for pending/error states
  const handlePress = () => {
    if (state.status === 'pending' || state.status === 'error') {
      console.log('[SyncStatusIndicator] Manual sync triggered')
      triggerSync()
    }
  }

  const statusColor = getStatusColor()
  const statusLabel = getStatusLabel()
  const showBadge = state.pendingCount > 0 && state.status !== 'syncing'
  const isInteractive = state.status === 'pending' || state.status === 'error'

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={!isInteractive}
      activeOpacity={isInteractive ? 0.7 : 1}
    >
      <View style={styles.indicatorContainer}>
        {/* Status dot */}
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: statusColor },
            state.status === 'syncing' && { transform: [{ scale: pulseAnim }] },
          ]}
        />

        {/* Pending count badge */}
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{state.pendingCount}</Text>
          </View>
        )}

        {/* Error icon */}
        {state.status === 'error' && (
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>!</Text>
          </View>
        )}
      </View>

      {/* Status label */}
      <Text style={styles.label}>{statusLabel}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 48, // Minimum touch target
    minHeight: 48, // Minimum touch target (gloves-on usability)
  },
  indicatorContainer: {
    position: 'relative',
    marginRight: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444', // Red
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  errorIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorIconText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937', // Dark gray (high contrast for sunlight)
  },
})
