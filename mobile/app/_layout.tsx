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
import { View, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { SyncProvider } from '../../src/contexts/SyncContext';
import { initDatabase } from '../../src/lib/watermelon';

export default function RootLayout() {
  const [database, setDatabase] = useState<any>(null);

  // Initialize WatermelonDB on mount
  useEffect(() => {
    initDatabase().then(setDatabase);
  }, []);

  // Don't render app until database is initialized
  if (!database) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider database={database}>
        <AuthProvider>
          <SyncProvider>
            <BottomSheetModalProvider>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#FFFFFF' },
                }}
              >
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
    </GestureHandlerRootView>
  );
}
