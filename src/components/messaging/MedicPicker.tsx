/**
 * MedicPicker - React Native
 *
 * Modal for starting new conversations.
 *
 * Medic flow: Single "Message Admin" button that creates or opens
 * a direct conversation with the org admin.
 *
 * Admin flow: Modal with org medic roster, search filter, and tap
 * to create/open conversation.
 *
 * iOS app talks to Supabase directly (not Next.js API routes).
 *
 * Phase 42: iOS Messaging & Offline
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useRole } from '../../../hooks/useRole';
import { supabase } from '../../lib/supabase';
import { getDatabase } from '../../lib/watermelon';
import { messageSync } from '../../services/MessageSync';
import Conversation from '../../database/models/Conversation';

interface Medic {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
}

interface MedicPickerProps {
  visible: boolean;
  onClose: () => void;
  onConversationReady: (conversationId: string) => void;
}

export function MedicPicker({
  visible,
  onClose,
  onConversationReady,
}: MedicPickerProps) {
  const { state: authState } = useAuth();
  const { orgId } = useOrg();
  const { isAdmin } = useRole();
  const [medics, setMedics] = useState<Medic[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch medics when modal opens (admin flow)
  useEffect(() => {
    if (!visible || !isAdmin || !orgId) return;

    async function loadMedics() {
      setLoading(true);
      const { data, error } = await supabase
        .from('medics')
        .select('id, user_id, first_name, last_name')
        .eq('org_id', orgId as any)
        .order('last_name', { ascending: true });

      if (error) {
        console.error('[MedicPicker] Error loading medics:', error);
        setLoading(false);
        return;
      }

      setMedics((data || []) as Medic[]);
      setLoading(false);
    }

    loadMedics();
  }, [visible, isAdmin, orgId]);

  /**
   * Find or create a direct conversation for a given medic_id.
   * Uses SELECT-then-INSERT pattern with 23505 duplicate handling.
   */
  const findOrCreateConversation = useCallback(
    async (medicId: string): Promise<string | null> => {
      if (!orgId || !authState.user) return null;

      const database = getDatabase();

      // First check local WatermelonDB for existing conversation
      const localExisting = await database.collections
        .get<Conversation>('conversations')
        .query(Q.where('medic_id', medicId), Q.where('type', 'direct'))
        .fetch();

      if (localExisting.length > 0) {
        return localExisting[0].id;
      }

      // Check Supabase for existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('org_id', orgId as any)
        .eq('medic_id', medicId as any)
        .eq('type', 'direct' as any)
        .limit(1);

      if (existing && existing.length > 0) {
        // Sync this conversation locally
        await messageSync.pullSync(authState.user.id, orgId);
        // Find it locally after sync
        const synced = await database.collections
          .get<Conversation>('conversations')
          .query(
            Q.where('server_id', (existing[0] as any).id)
          )
          .fetch();
        return synced.length > 0 ? synced[0].id : (existing[0] as any).id;
      }

      // Create new conversation on Supabase
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          org_id: orgId,
          type: 'direct',
          medic_id: medicId,
          created_by: authState.user.id,
        } as any)
        .select()
        .single();

      if (error) {
        // 23505 = unique violation (conversation already exists)
        if (error.code === '23505') {
          const { data: duplicate } = await supabase
            .from('conversations')
            .select('id')
            .eq('org_id', orgId as any)
            .eq('medic_id', medicId as any)
            .eq('type', 'direct' as any)
            .limit(1);

          if (duplicate && duplicate.length > 0) {
            await messageSync.pullSync(authState.user.id, orgId);
            const synced = await database.collections
              .get<Conversation>('conversations')
              .query(Q.where('server_id', (duplicate[0] as any).id))
              .fetch();
            return synced.length > 0 ? synced[0].id : (duplicate[0] as any).id;
          }
        }
        console.error('[MedicPicker] Error creating conversation:', error);
        return null;
      }

      // Pull sync to get the new conversation locally
      await messageSync.pullSync(authState.user.id, orgId);

      // Find locally after sync
      const created = await database.collections
        .get<Conversation>('conversations')
        .query(Q.where('server_id', (newConv as any).id))
        .fetch();

      return created.length > 0 ? created[0].id : (newConv as any).id;
    },
    [orgId, authState.user]
  );

  /**
   * Handle medic's "Message Admin" flow.
   * Creates/opens a direct conversation for the medic's own medic record.
   */
  const handleMessageAdmin = useCallback(async () => {
    if (!authState.user || !orgId) return;

    setCreating('admin');
    try {
      // Look up current user's medic record
      const { data: medicRecord } = await supabase
        .from('medics')
        .select('id')
        .eq('user_id', authState.user.id as any)
        .eq('org_id', orgId as any)
        .limit(1);

      if (!medicRecord || medicRecord.length === 0) {
        console.error('[MedicPicker] No medic record found for current user');
        return;
      }

      const medicId = (medicRecord[0] as any).id;
      const conversationId = await findOrCreateConversation(medicId);

      if (conversationId) {
        onClose();
        onConversationReady(conversationId);
      }
    } catch (err) {
      console.error('[MedicPicker] Error in Message Admin flow:', err);
    } finally {
      setCreating(null);
    }
  }, [authState.user, orgId, findOrCreateConversation, onClose, onConversationReady]);

  /**
   * Handle admin selecting a medic.
   */
  const handleSelectMedic = useCallback(
    async (medic: Medic) => {
      setCreating(medic.id);
      try {
        const conversationId = await findOrCreateConversation(medic.id);
        if (conversationId) {
          onClose();
          onConversationReady(conversationId);
        }
      } catch (err) {
        console.error('[MedicPicker] Error selecting medic:', err);
      } finally {
        setCreating(null);
      }
    },
    [findOrCreateConversation, onClose, onConversationReady]
  );

  // Medic flow: just a button (rendered in parent), no modal needed
  // This component handles the modal (admin flow) only when visible=true

  const filtered = medics.filter((m) =>
    `${m.first_name} ${m.last_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Medic flow: if not admin, show message admin confirmation
  if (!isAdmin) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Conversation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.medicActionContainer}>
            <Text style={styles.medicActionText}>
              Send a message to your organisation admin.
            </Text>
            <TouchableOpacity
              onPress={handleMessageAdmin}
              disabled={creating === 'admin'}
              style={[
                styles.messageAdminButton,
                creating === 'admin' && styles.buttonDisabled,
              ]}
            >
              {creating === 'admin' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.messageAdminButtonText}>Message Admin</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Admin flow: modal with medic picker
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Conversation</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>X</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search medics..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Medic list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#2563EB" size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectMedic(item)}
                disabled={creating === item.id}
                style={styles.medicRow}
                activeOpacity={0.7}
              >
                <View style={styles.medicAvatar}>
                  <Text style={styles.medicAvatarText}>
                    {item.first_name.charAt(0)}
                    {item.last_name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.medicName}>
                  {item.first_name} {item.last_name}
                </Text>
                {creating === item.id && (
                  <ActivityIndicator
                    color="#6B7280"
                    size="small"
                    style={styles.medicSpinner}
                  />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {search ? 'No medics found' : 'No medics in your organisation'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Standalone "Message Admin" button for medic users.
 * Can be used outside the MedicPicker modal (e.g., in EmptyState).
 */
export function MessageAdminButton({
  onPress,
  loading,
}: {
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[styles.messageAdminButton, loading && styles.buttonDisabled]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={styles.messageAdminButtonText}>Message Admin</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  medicAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicAvatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  medicName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  medicSpinner: {
    marginLeft: 8,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  medicActionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  medicActionText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  messageAdminButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAdminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
