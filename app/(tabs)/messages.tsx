/**
 * Messages Tab Screen
 *
 * Entry point for the Messages tab in the iOS app.
 * Renders ConversationList and triggers initial message sync on mount.
 * Header has a "+" button to open MedicPicker for starting new conversations.
 *
 * Phase 42: iOS Messaging & Offline
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useOrg } from '../../src/contexts/OrgContext';
import { useSync } from '../../src/contexts/SyncContext';
import { ConversationList } from '../../src/components/messaging/ConversationList';
import { MedicPicker } from '../../src/components/messaging/MedicPicker';

export default function MessagesScreen() {
  const { state: authState } = useAuth();
  const { orgId } = useOrg();
  const { triggerMessageSync } = useSync();
  const router = useRouter();
  const [pickerVisible, setPickerVisible] = useState(false);

  // Trigger initial message sync on mount
  useEffect(() => {
    if (authState.user && orgId) {
      triggerMessageSync().catch((err: Error) => {
        console.error('[MessagesScreen] Initial sync failed:', err);
      });
    }
  }, [authState.user?.id, orgId]);

  const handleConversationReady = useCallback(
    (conversationId: string) => {
      router.push(`/messages/${conversationId}` as any);
    },
    [router]
  );

  return (
    <View style={styles.container}>
      <ConversationList />

      {/* "+" button MedicPicker - separate from the ConversationList's own picker */}
      <MedicPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConversationReady={handleConversationReady}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
