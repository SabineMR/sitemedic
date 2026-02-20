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

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { useSync } from '../../src/contexts/SyncContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useOrg } from '../../src/contexts/OrgContext';
import { NotificationProvider, useNotifications } from '../../src/contexts/NotificationContext';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useRole } from '../../hooks/useRole';
import { getDatabase } from '../../src/lib/watermelon';
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

/**
 * Outer wrapper: provides NotificationContext to the inner tabs layout.
 * This split is needed because useNotifications() must be called inside
 * the provider tree, but the provider itself lives at this level.
 */
export default function TabsLayout() {
  return (
    <NotificationProvider>
      <TabsLayoutInner />
    </NotificationProvider>
  );
}

function TabsLayoutInner() {
  const isTablet = useIsTablet();
  const { state } = useAuth();
  const router = useRouter();
  const { primaryVertical } = useOrg();
  const { promptForPermission } = useNotifications();
  const personPluralLabel = primaryVertical === 'tv_film' ? 'Cast & Crew' : getPatientLabel(primaryVertical) + 's';
  const registryLabel = primaryVertical === 'tv_film' ? 'Cast & Crew Registry' : `${getPatientLabel(primaryVertical)} Registry`;
  const { isAdmin } = useRole();
  const [unreadBadge, setUnreadBadge] = useState<number>(0);
  const messagesTabPromptedRef = useRef(false);

  // Observe unread conversation count from WatermelonDB for tab badge
  useEffect(() => {
    try {
      const database = getDatabase();
      const subscription = database.collections
        .get('conversations')
        .query(Q.where('unread_count', Q.gt(0)))
        .observeCount()
        .subscribe((count) => {
          setUnreadBadge(count);
        });

      return () => subscription.unsubscribe();
    } catch {
      // Database may not be initialized yet during cold start
      return undefined;
    }
  }, []);

  // During auth load, user is null -> isAdmin is false, which would briefly show
  // the wrong tabs to an admin. Hide role-specific tabs while loading so the
  // correct set only appears once the session resolves.
  const medicOnlyHref = state.isLoading ? null : (isAdmin ? null : undefined);
  const adminOnlyHref = state.isLoading ? null : (!isAdmin ? null : undefined);

  // Standard auth guard: fires whenever isAuthenticated changes (e.g. SIGNED_OUT event)
  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      console.log('[TabsLayout] Not authenticated -- redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [state.isLoading, state.isAuthenticated]);

  // Direct session check on mount -- catches Fast Refresh stale isAuthenticated=true
  useEffect(() => {
    (async () => {
      const { supabase } = await import('../../src/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[TabsLayout] No Supabase session on mount -- redirecting to login');
        router.replace('/(auth)/login');
      }
    })();
  }, []);

  /**
   * Prompt for push notification permission when Messages tab is focused
   * for the first time. Uses a ref to avoid re-prompting within the session
   * and AsyncStorage flag (inside promptForPermission) to persist across sessions.
   */
  const handleMessagesTabFocus = useCallback(() => {
    if (messagesTabPromptedRef.current) return;
    messagesTabPromptedRef.current = true;

    console.log('[TabsLayout] Messages tab focused -- prompting for push permission');
    promptForPermission().catch((err: Error) => {
      console.error('[TabsLayout] Push permission prompt failed:', err);
    });
  }, [promptForPermission]);

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
          href: medicOnlyHref,
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="workers"
        options={{
          title: personPluralLabel,
          headerTitle: registryLabel,
          tabBarLabel: personPluralLabel,
          href: medicOnlyHref,
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
          href: medicOnlyHref,
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>🛡️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          headerTitle: 'Messages',
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>💬</Text>
          ),
          tabBarBadge: unreadBadge > 0 ? (unreadBadge > 99 ? '99+' : unreadBadge) : undefined,
        }}
        listeners={{
          focus: handleMessagesTabFocus,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          headerTitle: 'Documents',
          tabBarLabel: 'Documents',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>📄</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerTitle: 'Upcoming Events',
          tabBarLabel: 'Events',
          href: adminOnlyHref,
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          headerTitle: 'Team',
          tabBarLabel: 'Team',
          href: adminOnlyHref,
          tabBarIcon: ({ color }) => (
            <Text style={[styles.iconText, { color }]}>👥</Text>
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
