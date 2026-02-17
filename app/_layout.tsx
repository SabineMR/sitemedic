/**
 * Root Layout - ABSOLUTE MINIMUM TEST (no Stack, no providers)
 */

import React from 'react';
import { View, Text } from 'react-native';

console.log('[_layout] MODULE LOADED'); // fires at module load time

export default function RootLayout() {
  console.log('[RootLayout] RENDER — NO STACK TEST');
  return (
    <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>WORKS!</Text>
      <Text style={{ color: 'white', fontSize: 16, marginTop: 8 }}>Layout is rendering</Text>
    </View>
  );
}
