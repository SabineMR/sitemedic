/**
 * Root Layout - App Entry Point
 *
 * Wraps entire app in required providers:
 * - GestureHandlerRootView (for bottom sheets)
 * - BottomSheetModalProvider (for @gorhom/bottom-sheet)
 * - DatabaseProvider (WatermelonDB)
 * - AuthContext (Phase 1, 01-04)
 * - SyncContext (Phase 1, 01-05)
 *
 * Configures StatusBar for outdoor readability (dark-content).
 */

// MUST be imported at top level to register background task at global scope
import '../tasks/backgroundSyncTask';

import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SyncProvider } from '../src/contexts/SyncContext';
import { initDatabase } from '../src/lib/watermelon';
import { beaconService } from '../services/BeaconService';
import { emergencyAlertService } from '../services/EmergencyAlertService';
import EmergencyAlertReceiver from '../components/ui/EmergencyAlertReceiver';
import SOSButton from '../components/ui/SOSButton';

export default function RootLayout() {
  console.log('[RootLayout] RENDER');
  const [database, setDatabase] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize WatermelonDB and BLE beacon service on mount
  useEffect(() => {
    console.log('[RootLayout] Starting database init...');
    const t0 = Date.now();
    initDatabase()
      .then((db) => {
        console.log(`[RootLayout] Database initialized in ${Date.now() - t0}ms`);
        setDatabase(db);

        // Initialize BLE beacon service after DB is ready.
        // Non-fatal: GPS is primary; beacons are fallback for no-signal areas.
        beaconService.init().catch((err) => {
          console.warn('[RootLayout] Beacon service unavailable (BLE not supported on this device):', err);
        });

        // Request notification + microphone permissions and register push token.
        // Non-fatal: app works without these, but SOS push delivery won't function.
        emergencyAlertService.requestPermissions().then(() => {
          return emergencyAlertService.registerPushToken();
        }).catch((err) => {
          console.warn('[RootLayout] Emergency alert permissions not granted:', err);
        });
      })
      .catch((err) => {
        console.error(`[RootLayout] Database init FAILED after ${Date.now() - t0}ms:`, err);
        setError(err.message || String(err));
      });
  }, []);

  // Show error if database initialization failed
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF', padding: 20, justifyContent: 'center' }}>
        <View style={{ padding: 20, backgroundColor: '#fee', borderRadius: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#c00' }}>Database Error</Text>
          <Text style={{ fontSize: 14, color: '#600' }}>{error}</Text>
        </View>
      </View>
    );
  }

  // Don't render app until database is initialized
  if (!database) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>Starting SiteMedic…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider database={database}>
        <AuthProvider>
          <SyncProvider>
            <BottomSheetModalProvider>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              {/* Emergency alert receiver — listens for push notifications on every screen */}
              <EmergencyAlertReceiver />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#FFFFFF' },
                }}
              >
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="treatment/[id]"
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Treatment Details',
                  }}
                />
                <Stack.Screen
                  name="treatment/new"
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'New Treatment',
                  }}
                />
                <Stack.Screen
                  name="worker/[id]"
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Worker Profile',
                  }}
                />
                <Stack.Screen
                  name="worker/new"
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Add Worker',
                  }}
                />
                <Stack.Screen
                  name="worker/quick-add"
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Quick Add Worker',
                  }}
                />
                <Stack.Screen
                  name="safety/near-miss"
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Report Near-Miss',
                  }}
                />
                <Stack.Screen
                  name="safety/daily-check"
                  options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Daily Safety Check',
                  }}
                />
              </Stack>
            </BottomSheetModalProvider>
          </SyncProvider>
        </AuthProvider>
      </DatabaseProvider>
      {/* SOSButton outside all providers — no stacking context interference */}
      <SOSButton />
    </GestureHandlerRootView>
  );
}
