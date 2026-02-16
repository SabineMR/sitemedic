/**
 * SyncErrorDisplay Component
 *
 * Error banner with plain language messages and retry button.
 *
 * Shows when sync fails with user-friendly error messages instead of technical jargon.
 * Maps technical errors to construction site medic-friendly language.
 *
 * Features:
 * - Amber warning background (#FFFBEB) with left border emphasis
 * - Plain English error messages (no technical jargon)
 * - Manual retry button with 48pt minimum tap target (gloves-on)
 * - Auto-dismisses when sync succeeds
 *
 * Design: Consistent with OfflineBanner warning palette
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSync } from '../contexts/SyncContext'

/**
 * Map technical error messages to plain English.
 * Construction site medics should not see 'ECONNREFUSED' or 'JWT expired'.
 */
function getPlainLanguageError(error: string | null): string {
  if (!error) return ''
  const lower = error.toLowerCase()
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return 'Unable to reach the server. Check your signal and try again.'
  }
  if (lower.includes('auth') || lower.includes('jwt') || lower.includes('401') || lower.includes('403')) {
    return 'Your session has expired. Please log in again.'
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('server')) {
    return 'The server is temporarily unavailable. Your data is safe and will sync later.'
  }
  return 'Something went wrong with sync. Your data is saved locally.'
}

export function SyncErrorDisplay() {
  const { state, triggerSync } = useSync()

  if (state.status !== 'error' || !state.lastError) return null

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{getPlainLanguageError(state.lastError)}</Text>
      <Pressable
        onPress={triggerSync}
        style={styles.retryButton}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={styles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFBEB', // Amber/yellow background
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B', // Amber border
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#78350F', // Dark amber text
    fontWeight: '500',
    marginRight: 12,
  },
  retryButton: {
    backgroundColor: '#2563EB', // Blue
    borderRadius: 8,
    minHeight: 48, // 48pt minimum tap target
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
