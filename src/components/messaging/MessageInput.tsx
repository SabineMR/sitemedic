/**
 * MessageInput - React Native
 *
 * TextInput with Return-to-send and a visible Send button.
 * Fixed at the bottom of the screen inside KeyboardAvoidingView.
 * Creates local WatermelonDB Message record on send, then triggers push sync.
 *
 * Phase 42: iOS Messaging & Offline
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { getDatabase } from '../../lib/watermelon';
import { messageSync } from '../../services/MessageSync';
import Message from '../../database/models/Message';
import Conversation from '../../database/models/Conversation';

interface MessageInputProps {
  conversationId: string;
  orgId: string;
  userId: string;
  userName: string;
}

/**
 * Generate a UUID v4 for message idempotency.
 * Uses Math.random() as a fallback if Crypto.randomUUID is not available.
 */
function generateUUID(): string {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function MessageInput({
  conversationId,
  orgId,
  userId,
  userName,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const database = getDatabase();
      const now = Date.now();
      const idempotencyKey = generateUUID();

      await database.write(async () => {
        // 1. Create new Message record in WatermelonDB
        await database.collections
          .get<Message>('messages')
          .create((record: any) => {
            record.conversationId = conversationId;
            record.orgId = orgId;
            record.senderId = userId;
            record.senderName = userName;
            record.messageType = 'text';
            record.content = trimmed;
            record.status = 'queued';
            record.idempotencyKey = idempotencyKey;
            record.createdAt = now;
            record.updatedAt = now;
          });

        // 2. Update local Conversation metadata
        const conversation = await database.collections
          .get<Conversation>('conversations')
          .find(conversationId);

        await conversation.update((record: any) => {
          record.lastMessageAt = now;
          record.lastMessagePreview = trimmed.substring(0, 100);
        });
      });

      // 3. Clear input
      setContent('');

      // 4. Trigger push sync (fire-and-forget)
      messageSync.pushPendingMessages().catch((err) => {
        console.error('[MessageInput] Push sync failed:', err);
      });
    } catch (err) {
      console.error('[MessageInput] Failed to create message:', err);
    } finally {
      setSending(false);
    }
  }, [content, sending, conversationId, orgId, userId, userName]);

  const hasContent = content.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={content}
          onChangeText={setContent}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          multiline={false}
          editable={!sending}
          autoCapitalize="sentences"
          autoCorrect
        />
        {hasContent && (
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !hasContent}
            style={[
              styles.sendButton,
              (!hasContent || sending) && styles.sendButtonDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
