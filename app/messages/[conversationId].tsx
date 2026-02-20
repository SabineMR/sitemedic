/**
 * Message Thread Screen
 *
 * Expo Router dynamic route for viewing a conversation's messages.
 * Reads conversationId from route params, looks up conversation from
 * WatermelonDB, sets header title, marks conversation as read, and
 * renders the MessageThread component.
 *
 * Phase 42: iOS Messaging & Offline
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useOrg } from '../../src/contexts/OrgContext';
import { supabase } from '../../src/lib/supabase';
import { getDatabase } from '../../src/lib/watermelon';
import Conversation from '../../src/database/models/Conversation';
import { MessageThread } from '../../src/components/messaging/MessageThread';

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { state: authState } = useAuth();
  const { orgId } = useOrg();
  const [headerTitle, setHeaderTitle] = useState('Messages');

  /**
   * Look up conversation from WatermelonDB and set header title.
   * Mark conversation as read both locally and on Supabase.
   */
  useEffect(() => {
    if (!conversationId || !authState.user) return;

    async function loadAndMarkRead() {
      const database = getDatabase();
      const userId = authState.user!.id;

      try {
        // Look up the conversation by local WatermelonDB ID
        const conversation = await database.collections
          .get<Conversation>('conversations')
          .find(conversationId!);

        // Set header title to participant name
        if (conversation.participantName) {
          setHeaderTitle(conversation.participantName);
        }

        // Mark as read locally: set last_read_at and unread_count to 0
        const now = Date.now();
        await database.write(async () => {
          await conversation.update((record: any) => {
            record.lastReadAt = now;
            record.unreadCount = 0;
          });
        });

        // Mark as read on Supabase using the conversation's server_id
        const serverConversationId = conversation.serverId;
        if (serverConversationId && orgId) {
          const { error } = await supabase
            .from('conversation_read_status')
            .upsert(
              {
                user_id: userId,
                conversation_id: serverConversationId,
                org_id: orgId,
                last_read_at: new Date().toISOString(),
              } as any,
              { onConflict: 'user_id,conversation_id' }
            );

          if (error) {
            console.error('[ConversationScreen] Failed to mark read on server:', error);
          }
        }
      } catch (err) {
        console.error('[ConversationScreen] Failed to load conversation:', err);
      }
    }

    loadAndMarkRead();
  }, [conversationId, authState.user?.id, orgId]);

  if (!conversationId) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: headerTitle,
          headerBackTitle: 'Messages',
        }}
      />
      <MessageThread conversationId={conversationId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
