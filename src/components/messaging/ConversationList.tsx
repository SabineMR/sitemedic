/**
 * ConversationList - React Native
 *
 * FlatList of conversations loaded from WatermelonDB with reactive observation.
 * Supports pull-to-refresh via messageSync, local search filter by participant name,
 * and navigation to message thread on tap.
 *
 * Phase 42: iOS Messaging & Offline
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useRole } from '../../../hooks/useRole';
import { useSync } from '../../contexts/SyncContext';
import { getDatabase } from '../../lib/watermelon';
import Conversation from '../../database/models/Conversation';
import { ConversationRow } from './ConversationRow';
import { EmptyState } from './EmptyState';
import { MedicPicker, MessageAdminButton } from './MedicPicker';

export function ConversationList() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { orgId } = useOrg();
  const { isAdmin } = useRole();
  const { triggerMessageSync, state: syncState } = useSync();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  /**
   * Subscribe to WatermelonDB conversations collection with reactive observation.
   * Sorted by last_message_at descending (most recent first).
   */
  useEffect(() => {
    const database = getDatabase();
    const subscription = database.collections
      .get<Conversation>('conversations')
      .query(Q.sortBy('last_message_at', Q.desc))
      .observe()
      .subscribe((records) => {
        setConversations(records);
      });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Pull-to-refresh: trigger message sync then re-observe.
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await triggerMessageSync();
    } catch (err) {
      console.error('[ConversationList] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [triggerMessageSync]);

  /**
   * Navigate to conversation thread.
   */
  const handleConversationPress = useCallback(
    (conversation: Conversation) => {
      router.push(`/messages/${conversation.id}` as any);
    },
    [router]
  );

  /**
   * Handle conversation created/found from MedicPicker.
   */
  const handleConversationReady = useCallback(
    (conversationId: string) => {
      router.push(`/messages/${conversationId}` as any);
    },
    [router]
  );

  // Apply local search filter
  const filtered = search
    ? conversations.filter(
        (c) =>
          c.participantName &&
          c.participantName.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  return (
    <View style={styles.container}>
      {/* Search filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Conversation list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            participantName={item.participantName || 'Unknown'}
            lastMessagePreview={item.lastMessagePreview}
            lastMessageAt={item.lastMessageAt}
            unreadCount={item.unreadCount}
            onPress={() => handleConversationPress(item)}
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
        ListEmptyComponent={
          <EmptyState
            actionButton={
              !isAdmin ? (
                <MessageAdminButton
                  onPress={() => setPickerVisible(true)}
                />
              ) : undefined
            }
          />
        }
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyList : undefined
        }
      />

      {/* MedicPicker modal */}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  emptyList: {
    flexGrow: 1,
  },
});
