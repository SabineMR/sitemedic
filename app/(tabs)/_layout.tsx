/**
 * Tab Navigation Layout
 *
 * Phone: 5-tab bottom bar (80px height, gloves-on usability)
 * iPad: Left sidebar rail (240px wide) + content fills remaining width
 *
 * Design specs:
 * - 80px tab bar height on phone (gloves-on usability)
 * - 28px icons, 14px labels on phone
 * - High contrast colors (#2563EB active, #6B7280 inactive)
 * - Sync status indicator in header (phone) or sidebar footer (iPad)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSync } from '../../src/contexts/SyncContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useOrg } from '../../src/contexts/OrgContext';
import { useIsTablet } from '../../hooks/useIsTablet';
import TabletSidebar from '../../components/ui/TabletSidebar';
import { getPatientLabel } from '../../services/taxonomy/vertical-outcome-labels';


function SyncStatusIndicator() {
  const { state } = useSync();

  const getStatusColor = () => {
    switch (state.status) {
      case 'synced':  return '#10B981';
      case 'syncing': return '#2563EB';
      case 'pending': return '#F59E0B';
      case 'offline': return '#6B7280';
      case 'error':   return '#EF4444';
      default:        return '#6B7280';
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
  const isTablet = useIsTablet();
  const { state } = useAuth();
  const router = useRouter();
  const { primaryVertical } = useOrg();
  const personPluralLabel = primaryVertical === 'tv_film' ? 'Cast & Crew' : getPatientLabel(primaryVertical) + 's';
  const registryLabel = primaryVertical === 'tv_film' ? 'Cast & Crew Registry' : `${getPatientLabel(primaryVertical)} Registry`;

  // Standard auth guard: fires whenever isAuthenticated changes (e.g. SIGNED_OUT event)
  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      console.log('[TabsLayout] Not authenticated — redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [state.isLoading, state.isAuthenticated]);

  // Direct session check on mount — catches Fast Refresh stale isAuthenticated=true
  useEffect(() => {
    (async () => {
      const { supabase } = await import('../../src/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[TabsLayout] No Supabase session on mount — redirecting to login');
        router.replace('/(auth)/login');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: true,
        // On tablet the sidebar handles navigation labels, so hide the header title
        // to avoid double-labelling. On phone keep the header.
        headerRight: isTablet ? undefined : () => <SyncStatusIndicator />,
        tabBarStyle: isTablet ? styles.tabBarHidden : styles.tabBar,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}
      // Replace bottom tab bar with sidebar on iPad
      tabBar={isTablet ? (props) => <TabletSidebar {...props} /> : undefined}
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
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
    </View>
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
  // Hidden on tablet — sidebar takes over navigation
  tabBarHidden: {
    display: 'none',
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
