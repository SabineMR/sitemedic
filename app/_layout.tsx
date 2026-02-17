/**
 * Root Layout - MINIMAL TEST
 * Stripped to bare minimum to diagnose blank screen.
 * If this renders (red background + "WORKS!"), the issue is with providers/imports.
 * If still blank, Expo Router itself is not calling the layout.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';

export default function RootLayout() {
  console.log('[RootLayout] RENDER — MINIMAL TEST');
  return (
    <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>WORKS!</Text>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
