/**
 * Tab Navigation Layout
 *
 * 4-tab navigation: Home, Treatments, Workers, Safety
 * Design specs:
 * - 80px tab bar height (gloves-on usability)
 * - 28px icons, 14px labels
 * - High contrast colors (#2563EB active, #6B7280 inactive)
 * - Sync status indicator in header
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSync } from '../../../src/contexts/SyncContext';

function SyncStatusIndicator() {
  const { state } = useSync();

  const getStatusColor = () => {
    switch (state.status) {
      case 'synced':
        return '#10B981'; // Green
      case 'syncing':
        return '#2563EB'; // Blue
      case 'pending':
        return '#F59E0B'; // Amber
      case 'offline':
        return '#6B7280'; // Grey
      case 'error':
        return '#EF4444'; // Red
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = () => {
    if (state.status === 'pending' && state.pendingCount > 0) {
      return `${state.pendingCount} pending`;
    }
    return state.status;
  };

  return (
    <View style={styles.syncIndicator}>
      <View style={[styles.syncDot, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.syncText}>{getStatusLabel()}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <SyncStatusIndicator />,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'SiteMedic',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="treatments"
        options={{
          title: 'Treatments',
          headerTitle: 'Treatments',
          tabBarLabel: 'Treatments',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="workers"
        options={{
          title: 'Workers',
          headerTitle: 'Worker Registry',
          tabBarLabel: 'Workers',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>👷</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="safety"
        options={{
          title: 'Safety',
          headerTitle: 'Safety',
          tabBarLabel: 'Safety',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>🛡️</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 80,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabBarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBarIcon: {
    marginBottom: 0,
  },
  iconText: {
    fontSize: 28,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
});
