/**
 * MessageThread - React Native
 *
 * Inverted FlatList of messages with auto-scroll to latest.
 * Data loaded reactively from WatermelonDB, filtered by conversation_id.
 * Includes MessageInput at the bottom inside KeyboardAvoidingView.
 *
 * Phase 42: iOS Messaging & Offline
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useSync } from '../../contexts/SyncContext';
import { getDatabase } from '../../lib/watermelon';
import { messageSync } from '../../services/MessageSync';
import MessageModel from '../../database/models/Message';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';

interface MessageThreadProps {
  conversationId: string;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { state: authState } = useAuth();
  const { orgId } = useOrg();
  const { triggerMessageSync } = useSync();
  const [messages, setMessages] = useState<MessageModel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const prevMessageCount = useRef(0);

  const userId = authState.user?.id || '';
  const userName = authState.user?.fullName || 'You';

  /**
   * Subscribe to WatermelonDB messages collection, filtered by conversation_id.
   * Sorted by created_at ascending (inverted FlatList reverses display).
   */
  useEffect(() => {
    const database = getDatabase();
    const subscription = database.collections
      .get<MessageModel>('messages')
      .query(
        Q.where('conversation_id', conversationId),
        Q.sortBy('created_at', Q.asc)
      )
      .observe()
      .subscribe((records) => {
        setMessages(records);
      });

    return () => subscription.unsubscribe();
  }, [conversationId]);

  /**
   * Scroll to the latest message when a new message is added.
   * Since FlatList is inverted, scrolling to offset 0 shows the newest message.
   */
  useEffect(() => {
    if (messages.length > prevMessageCount.current && messages.length > 0) {
      // New message added — scroll to bottom (offset 0 in inverted list)
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  /**
   * Handle retry for a failed message: reset status to 'queued' and trigger push.
   */
  const handleRetry = useCallback(async (msg: MessageModel) => {
    try {
      const database = getDatabase();
      await database.write(async () => {
        await msg.update((record: any) => {
          record.status = 'queued';
        });
      });
      // Trigger push sync
      messageSync.pushPendingMessages().catch((err) => {
        console.error('[MessageThread] Retry push failed:', err);
      });
    } catch (err) {
      console.error('[MessageThread] Failed to reset message for retry:', err);
    }
  }, []);

  /**
   * Pull-to-refresh: trigger message sync for fresh data.
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await triggerMessageSync();
    } catch (err) {
      console.error('[MessageThread] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [triggerMessageSync]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item }) => (
          <MessageItem
            senderName={item.senderName || 'Unknown'}
            content={item.content || ''}
            createdAt={item.createdAt}
            status={item.status}
            isOwnMessage={item.senderId === userId}
            onRetry={
              item.status === 'failed'
                ? () => handleRetry(item)
                : undefined
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={styles.listContent}
      />
      <MessageInput
        conversationId={conversationId}
        orgId={orgId || ''}
        userId={userId}
        userName={userName}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
  },
});
