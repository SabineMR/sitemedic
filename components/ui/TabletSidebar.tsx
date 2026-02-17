/**
 * TabletSidebar.tsx
 *
 * Left-rail navigation for iPad. Replaces the bottom tab bar on tablets
 * with a vertical sidebar, giving more screen space to content.
 *
 * Design:
 * - 240px wide sidebar on the left
 * - App name + SiteMedic logo at top
 * - Navigation items with icon + label, full-width tap targets
 * - Sync status indicator at the bottom of the sidebar
 * - Same dark colour scheme as the phone tab bar
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSync } from '../../src/contexts/SyncContext';

const SIDEBAR_WIDTH = 240;

const TAB_ICONS: Record<string, string> = {
  index: '🏠',
  treatments: '📋',
  workers: '👷',
  safety: '🛡️',
  settings: '⚙️',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  treatments: 'Treatments',
  workers: 'Workers',
  safety: 'Safety',
  settings: 'Settings',
};

export default function TabletSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { state: syncState } = useSync();

  const syncColor = {
    synced: '#10B981',
    syncing: '#2563EB',
    pending: '#F59E0B',
    offline: '#6B7280',
    error: '#EF4444',
  }[syncState.status] ?? '#6B7280';

  const syncLabel =
    syncState.status === 'pending' && syncState.pendingCount > 0
      ? `${syncState.pendingCount} pending`
      : syncState.status;

  return (
    <SafeAreaView style={styles.sidebar}>
      {/* App header */}
      <View style={styles.header}>
        <Text style={styles.appName}>SiteMedic</Text>
        <Text style={styles.appTagline}>Field Portal</Text>
      </View>

      <View style={styles.divider} />

      {/* Navigation items */}
      <View style={styles.navItems}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name] ?? '●';
          const label = TAB_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              style={[styles.navItem, isFocused && styles.navItemActive]}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <Text style={styles.navIcon}>{icon}</Text>
              <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>
                {label}
              </Text>
              {isFocused && <View style={styles.activeIndicator} />}
            </Pressable>
          );
        })}
      </View>

      {/* Sync status at bottom */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        <View style={styles.syncRow}>
          <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
          <Text style={styles.syncText}>{syncLabel}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0A0E1A',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 1.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
  },
  navItems: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 14,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#1E293B',
  },
  navIcon: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  navLabelActive: {
    color: '#F1F5F9',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -10,
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#0EA5E9',
  },
  footer: {
    paddingBottom: 16,
    gap: 12,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'capitalize',
  },
});
