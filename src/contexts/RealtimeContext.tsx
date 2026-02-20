/**
 * RealtimeContext
 *
 * React Context for Supabase Realtime subscriptions on iOS.
 *
 * Provides:
 * - Single Supabase Realtime channel per user (not per conversation)
 * - Listens for INSERT on `messages` table (new message arrival)
 * - Listens for UPDATE on `conversation_read_status` table (read receipt updates)
 * - Upserts incoming messages into WatermelonDB for offline-safe rendering
 * - Updates conversation metadata (last_message_at, preview, unread_count)
 * - Serialized write queue to prevent concurrent db.write() conflicts with MessageSync
 * - Exposes `isConnected` boolean for UI connection status indicators
 *
 * WatermelonDB observers in ConversationList and MessageThread automatically
 * trigger re-render when records are created/updated via this provider.
 *
 * Phase 43: Real-time Push Notifications
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { Q } from '@nozbe/watermelondb'
import { supabase } from '../lib/supabase'
import { getDatabase } from '../lib/watermelon'
import { useAuth } from './AuthContext'
import { useOrg } from './OrgContext'
import Conversation from '../database/models/Conversation'
import Message from '../database/models/Message'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =============================================================================
// TYPES
// =============================================================================

interface RealtimeContextType {
  /** Whether the Realtime channel is currently connected (SUBSCRIBED status) */
  isConnected: boolean
}

// =============================================================================
// CONTEXT
// =============================================================================

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

// =============================================================================
// WRITE QUEUE
// =============================================================================

/**
 * Serialized write queue to prevent concurrent db.write() conflicts.
 * Realtime events can fire rapidly; we process writes one at a time
 * to avoid WatermelonDB "Cannot call db.write() while another write is running" errors.
 */
class WriteQueue {
  private queue: (() => Promise<void>)[] = []
  private processing = false

  async enqueue(writeFn: () => Promise<void>): Promise<void> {
    this.queue.push(writeFn)
    if (!this.processing) {
      await this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!
      try {
        await fn()
      } catch (error) {
        console.error('[RealtimeContext] Write queue error:', error)
      }
    }
    this.processing = false
  }
}

// =============================================================================
// SENDER NAME CACHE
// =============================================================================

/**
 * Session-level cache for sender name lookups.
 * Avoids repeated Supabase queries for the same sender_id.
 */
const senderNameCache = new Map<string, string>()

/**
 * Resolve sender display name for a given sender_id.
 *
 * 1. Check session cache
 * 2. Check existing WatermelonDB messages for same sender_id
 * 3. Fetch from Supabase medics table (single query, cached)
 * 4. Non-medic senders default to "Admin"
 */
async function resolveSenderName(senderId: string, orgId: string): Promise<string> {
  // 1. Check cache
  const cached = senderNameCache.get(senderId)
  if (cached) return cached

  const database = getDatabase()

  // 2. Check existing local messages from this sender
  try {
    const existingMessages = await database.collections
      .get<Message>('messages')
      .query(Q.where('sender_id', senderId), Q.take(1))
      .fetch()

    if (existingMessages.length > 0 && existingMessages[0].senderName) {
      const name = existingMessages[0].senderName
      senderNameCache.set(senderId, name)
      return name
    }
  } catch {
    // Non-fatal: fall through to Supabase lookup
  }

  // 3. Fetch from Supabase medics table
  try {
    const { data: medic } = await supabase
      .from('medics')
      .select('first_name, last_name')
      .eq('user_id', senderId as any)
      .eq('org_id', orgId as any)
      .maybeSingle()

    if (medic) {
      const name = `${(medic as any).first_name} ${(medic as any).last_name}`.trim()
      senderNameCache.set(senderId, name)
      return name
    }
  } catch {
    // Non-fatal: default to Admin
  }

  // 4. Non-medic sender
  const defaultName = 'Admin'
  senderNameCache.set(senderId, defaultName)
  return defaultName
}

// =============================================================================
// PROVIDER
// =============================================================================

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { state: authState } = useAuth()
  const { orgId } = useOrg()
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const writeQueue = useRef(new WriteQueue()).current

  const userId = authState.user?.id
  const userRole = authState.user?.role

  /**
   * Handle incoming message INSERT event from Realtime.
   * Upserts the message into WatermelonDB and updates the parent conversation.
   */
  const handleMessageInsert = useCallback(
    (payload: any) => {
      if (!userId || !orgId) return

      const newMsg = payload.new
      if (!newMsg || !newMsg.id) return

      console.log('[RealtimeContext] Message INSERT received:', newMsg.id)

      writeQueue.enqueue(async () => {
        const database = getDatabase()

        // Check idempotency: message may have already arrived via pull sync
        const existing = await database.collections
          .get<Message>('messages')
          .query(Q.where('server_id', newMsg.id))
          .fetch()

        if (existing.length > 0) {
          console.log('[RealtimeContext] Message already exists locally, skipping:', newMsg.id)
          return
        }

        // Resolve the local WatermelonDB conversation ID from the server conversation UUID
        const serverConvId = newMsg.conversation_id as string
        const localConvs = await database.collections
          .get<Conversation>('conversations')
          .query(Q.where('server_id', serverConvId))
          .fetch()

        if (localConvs.length === 0) {
          console.warn('[RealtimeContext] No local conversation for server_id:', serverConvId, '— skipping message')
          return
        }

        const localConv = localConvs[0]
        const localConvId = localConv.id

        // Resolve sender name
        const senderName = await resolveSenderName(newMsg.sender_id, orgId)

        // Single db.write() to create message and update conversation
        await database.write(async () => {
          // Create the new Message record
          await database.collections
            .get<Message>('messages')
            .create((record: any) => {
              record.serverId = newMsg.id
              record.conversationId = localConvId
              record.orgId = newMsg.org_id
              record.senderId = newMsg.sender_id
              record.senderName = senderName
              record.messageType = newMsg.message_type || 'text'
              record.content = newMsg.content || undefined
              record.status = newMsg.status || 'sent'
              record.createdAt = new Date(newMsg.created_at).getTime()
              record.updatedAt = new Date(newMsg.updated_at || newMsg.created_at).getTime()
            })

          // Update conversation metadata
          const content = (newMsg.content as string) || ''
          const isOwnMessage = newMsg.sender_id === userId

          await localConv.update((record: any) => {
            record.lastMessageAt = new Date(newMsg.created_at).getTime()
            record.lastMessagePreview = content.substring(0, 100)

            // Increment unread count only for messages from other users
            if (!isOwnMessage) {
              record.unreadCount = (localConv.unreadCount || 0) + 1
            }
          })
        })

        console.log('[RealtimeContext] Message upserted into WatermelonDB:', newMsg.id)
      })
    },
    [userId, orgId, writeQueue]
  )

  /**
   * Handle conversation_read_status UPDATE event from Realtime.
   * Updates the local conversation's lastReadAt and recomputes unread count.
   */
  const handleReadStatusUpdate = useCallback(
    (payload: any) => {
      if (!userId || !orgId) return

      const updated = payload.new
      if (!updated) return

      // Only process read status updates for the current user
      if (updated.user_id !== userId) return

      const serverConvId = updated.conversation_id as string
      const newLastReadAt = new Date(updated.last_read_at).getTime()

      console.log('[RealtimeContext] Read status UPDATE received for conversation:', serverConvId)

      writeQueue.enqueue(async () => {
        const database = getDatabase()

        const localConvs = await database.collections
          .get<Conversation>('conversations')
          .query(Q.where('server_id', serverConvId))
          .fetch()

        if (localConvs.length === 0) return

        const localConv = localConvs[0]

        // Recompute unread count: messages from others after the new lastReadAt
        const unreadCount = await database.collections
          .get<Message>('messages')
          .query(
            Q.where('conversation_id', localConv.id),
            Q.where('sender_id', Q.notEq(userId)),
            Q.where('created_at', Q.gt(newLastReadAt))
          )
          .fetchCount()

        await database.write(async () => {
          await localConv.update((record: any) => {
            record.lastReadAt = newLastReadAt
            record.unreadCount = unreadCount
          })
        })

        console.log('[RealtimeContext] Read status updated, unread count:', unreadCount)
      })
    },
    [userId, orgId, writeQueue]
  )

  /**
   * Subscribe to Supabase Realtime channel when userId and orgId are available.
   * Unsubscribe on unmount or when user/org changes.
   */
  useEffect(() => {
    if (!userId || !orgId) {
      setIsConnected(false)
      return
    }

    const channelName = `user-${userId}:org_${orgId}`
    console.log('[RealtimeContext] Subscribing to channel:', channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${orgId}`,
        },
        handleMessageInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_read_status',
          filter: `org_id=eq.${orgId}`,
        },
        handleReadStatusUpdate
      )
      .subscribe((status) => {
        console.log('[RealtimeContext] Channel status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      console.log('[RealtimeContext] Unsubscribing from channel:', channelName)
      supabase.removeChannel(channel)
      channelRef.current = null
      setIsConnected(false)
      // Clear sender name cache on channel cleanup
      senderNameCache.clear()
    }
  }, [userId, orgId, handleMessageInsert, handleReadStatusUpdate])

  const value: RealtimeContextType = { isConnected }

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access Realtime context.
 * Must be used within RealtimeProvider.
 */
export function useRealtime(): RealtimeContextType {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider')
  }
  return context
}
