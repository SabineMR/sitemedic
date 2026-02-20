/**
 * EmptyState - React Native
 *
 * Centered view shown when no conversations exist.
 * - Medic role: "Message Admin" button
 * - Admin role: "Start a conversation" button that opens MedicPicker
 *
 * Phase 42: iOS Messaging & Offline
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EmptyStateProps {
  /** Action button rendered by parent (MedicPicker or Message Admin button) */
  actionButton?: React.ReactNode;
}

export function EmptyState({ actionButton }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{'    '}</Text>
      <Text style={styles.title}>No conversations yet</Text>
      <Text style={styles.subtitle}>
        Start messaging to stay connected with your team.
      </Text>
      {actionButton && (
        <View style={styles.actionContainer}>{actionButton}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionContainer: {
    marginTop: 8,
  },
});
