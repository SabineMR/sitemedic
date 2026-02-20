/**
 * MessageSync Service
 *
 * Pull and push sync logic for messaging data (conversations + messages).
 *
 * Pull sync: Fetches conversations and messages from Supabase REST API,
 * upserts them into WatermelonDB local cache. Uses incremental sync via
 * lastSyncedAt timestamp stored in AsyncStorage.
 *
 * Push sync: Sends locally-queued messages (status='queued') to Supabase,
 * updates local status from 'queued' to 'sent' on success.
 *
 * This service is self-contained -- does NOT modify the existing SyncQueue
 * used for clinical data (treatments, workers, near_misses, safety_checks).
 *
 * Phase 42: iOS Messaging & Offline
 */

import { Q } from '@nozbe/watermelondb'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDatabase } from '../lib/watermelon'
import { supabase } from '../lib/supabase'
import Conversation from '../database/models/Conversation'
import Message from '../database/models/Message'

const LAST_SYNCED_KEY = 'messaging_last_synced_at'
const CONVERSATIONS_LIMIT = 200
const MESSAGES_LIMIT = 500
const INITIAL_MESSAGES_PER_CONVERSATION = 100

export class MessageSync {
  private isSyncing: boolean = false
  private lastSyncedAt: number = 0 // epoch ms, loaded from AsyncStorage

  /**
   * Pull conversations and messages from Supabase into WatermelonDB.
   * Uses incremental sync: only fetches records newer than lastSyncedAt.
   * First sync (lastSyncedAt === 0) fetches all conversations + recent messages.
   *
   * @param userId - Current authenticated user's Supabase UUID
   * @param orgId - Current organisation ID
   * @returns Sync result with counts
   */
  async pullSync(
    userId: string,
    orgId: string
  ): Promise<{ conversationsSynced: number; messagesSynced: number }> {
    if (this.isSyncing) {
      console.log('[MessageSync] Already syncing, skipping')
      return { conversationsSynced: 0, messagesSynced: 0 }
    }

    this.isSyncing = true
    let conversationsSynced = 0
    let messagesSynced = 0

    try {
      // Load last synced timestamp from AsyncStorage
      await this.loadLastSyncedAt()

      const database = getDatabase()
      const isFirstSync = this.lastSyncedAt === 0
      const lastSyncedAtISO = isFirstSync
        ? new Date(0).toISOString()
        : new Date(this.lastSyncedAt).toISOString()

      // --- Pull conversations ---
      const { data: serverConversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('org_id', orgId as any)
        .gt('updated_at', lastSyncedAtISO as any)
        .order('updated_at', { ascending: false })
        .limit(CONVERSATIONS_LIMIT)

      if (convError) {
        console.error('[MessageSync] Failed to fetch conversations:', convError)
        throw convError
      }

      // Fetch read statuses for unread count computation
      const { data: readStatuses } = await supabase
        .from('conversation_read_status')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId as any)
        .eq('org_id', orgId as any)

      const readStatusMap = new Map<string, string>()
      if (readStatuses) {
        for (const rs of readStatuses) {
          readStatusMap.set(rs.conversation_id, rs.last_read_at)
        }
      }

      // Resolve participant names: bulk fetch medics for name lookup
      const { data: medics } = await supabase
        .from('medics')
        .select('user_id, first_name, last_name')
        .eq('org_id', orgId as any)

      const medicNameMap = new Map<string, string>()
      if (medics) {
        for (const m of medics) {
          medicNameMap.set(
            (m as any).user_id,
            `${(m as any).first_name} ${(m as any).last_name}`.trim()
          )
        }
      }

      // Determine if current user is a medic in this org
      const currentUserIsMedic = medicNameMap.has(userId)

      if (serverConversations && serverConversations.length > 0) {
        await database.write(async () => {
          const batchOps: any[] = []

          for (const sc of serverConversations) {
            const serverId = (sc as any).id as string

            // Resolve participant name
            let participantName: string | undefined
            if ((sc as any).type === 'direct') {
              if (currentUserIsMedic) {
                // Medic sees "Admin" as the other participant
                participantName = 'Admin'
              } else {
                // Admin sees medic name
                const medicId = (sc as any).medic_id as string | null
                if (medicId) {
                  participantName = medicNameMap.get(medicId) || 'Unknown Medic'
                }
              }
            } else {
              // Broadcast: use subject as display name
              participantName = (sc as any).subject || 'Broadcast'
            }

            // Compute unread count
            const lastReadAt = readStatusMap.get(serverId)
            let unreadCount = 0
            // We'll compute actual unread count from messages after pulling them
            // For now, set a placeholder that will be refined after message sync

            // Check if conversation exists locally by server_id
            const existing = await database.collections
              .get<Conversation>('conversations')
              .query(Q.where('server_id', serverId))
              .fetch()

            if (existing.length > 0) {
              // Update existing record
              batchOps.push(
                existing[0].prepareUpdate((record: any) => {
                  record.orgId = (sc as any).org_id
                  record.type = (sc as any).type
                  record.subject = (sc as any).subject || undefined
                  record.medicId = (sc as any).medic_id || undefined
                  record.createdBy = (sc as any).created_by
                  record.lastMessageAt = (sc as any).last_message_at
                    ? new Date((sc as any).last_message_at).getTime()
                    : undefined
                  record.lastMessagePreview = (sc as any).last_message_preview || undefined
                  record.participantName = participantName
                  record.unreadCount = unreadCount
                  if (lastReadAt) {
                    record.lastReadAt = new Date(lastReadAt).getTime()
                  }
                  record.updatedAt = new Date((sc as any).updated_at).getTime()
                })
              )
            } else {
              // Create new local record
              batchOps.push(
                database.collections
                  .get<Conversation>('conversations')
                  .prepareCreate((record: any) => {
                    record.serverId = serverId
                    record.orgId = (sc as any).org_id
                    record.type = (sc as any).type
                    record.subject = (sc as any).subject || undefined
                    record.medicId = (sc as any).medic_id || undefined
                    record.createdBy = (sc as any).created_by
                    record.lastMessageAt = (sc as any).last_message_at
                      ? new Date((sc as any).last_message_at).getTime()
                      : undefined
                    record.lastMessagePreview = (sc as any).last_message_preview || undefined
                    record.participantName = participantName
                    record.unreadCount = unreadCount
                    if (lastReadAt) {
                      record.lastReadAt = new Date(lastReadAt).getTime()
                    }
                    record.createdAt = new Date((sc as any).created_at).getTime()
                    record.updatedAt = new Date((sc as any).updated_at).getTime()
                  })
              )
            }
          }

          if (batchOps.length > 0) {
            await database.batch(...batchOps)
          }
        })

        conversationsSynced = serverConversations.length
      }

      // --- Pull messages ---
      let serverMessages: any[] = []

      if (isFirstSync) {
        // First sync: fetch last N messages per conversation
        const localConversations = await database.collections
          .get<Conversation>('conversations')
          .query(Q.where('org_id', orgId))
          .fetch()

        for (const conv of localConversations) {
          if (!conv.serverId) continue

          const { data: msgs, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.serverId as any)
            .eq('org_id', orgId as any)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(INITIAL_MESSAGES_PER_CONVERSATION)

          if (msgError) {
            console.error(`[MessageSync] Failed to fetch messages for conversation ${conv.serverId}:`, msgError)
            continue
          }

          if (msgs) {
            serverMessages.push(...msgs)
          }
        }
      } else {
        // Incremental sync: fetch all new messages across conversations
        const { data: msgs, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('org_id', orgId as any)
          .is('deleted_at', null)
          .gt('created_at', lastSyncedAtISO as any)
          .order('created_at', { ascending: true })
          .limit(MESSAGES_LIMIT)

        if (msgError) {
          console.error('[MessageSync] Failed to fetch messages:', msgError)
          throw msgError
        }

        if (msgs) {
          serverMessages = msgs
        }
      }

      // Resolve sender names from medics table
      const uniqueSenderIds = [...new Set(serverMessages.map((m: any) => m.sender_id as string))]
      const senderNameMap = new Map<string, string>()
      for (const senderId of uniqueSenderIds) {
        const name = medicNameMap.get(senderId)
        senderNameMap.set(senderId, name || 'Admin')
      }

      if (serverMessages.length > 0) {
        await database.write(async () => {
          const batchOps: any[] = []

          for (const sm of serverMessages) {
            const serverId = (sm as any).id as string
            const senderName = senderNameMap.get((sm as any).sender_id) || 'Admin'

            // Check if message exists locally by server_id
            const existing = await database.collections
              .get<Message>('messages')
              .query(Q.where('server_id', serverId))
              .fetch()

            if (existing.length > 0) {
              // Update existing record (status may have changed)
              batchOps.push(
                existing[0].prepareUpdate((record: any) => {
                  record.status = (sm as any).status
                  record.senderName = senderName
                  record.updatedAt = new Date((sm as any).updated_at).getTime()
                })
              )
            } else {
              // Create new local record
              batchOps.push(
                database.collections
                  .get<Message>('messages')
                  .prepareCreate((record: any) => {
                    record.serverId = serverId
                    record.conversationId = (sm as any).conversation_id
                    record.orgId = (sm as any).org_id
                    record.senderId = (sm as any).sender_id
                    record.senderName = senderName
                    record.messageType = (sm as any).message_type
                    record.content = (sm as any).content || undefined
                    record.status = (sm as any).status
                    record.createdAt = new Date((sm as any).created_at).getTime()
                    record.updatedAt = new Date((sm as any).updated_at).getTime()
                  })
              )
            }
          }

          if (batchOps.length > 0) {
            await database.batch(...batchOps)
          }
        })

        messagesSynced = serverMessages.length
      }

      // --- Compute accurate unread counts after message sync ---
      await this.recomputeUnreadCounts(userId, orgId)

      // Save current timestamp as lastSyncedAt
      const now = Date.now()
      this.lastSyncedAt = now
      await AsyncStorage.setItem(LAST_SYNCED_KEY, now.toString())

      console.log(`[MessageSync] Pull sync complete: ${conversationsSynced} conversations, ${messagesSynced} messages`)
    } catch (error) {
      console.error('[MessageSync] Pull sync failed:', error)
      throw error
    } finally {
      this.isSyncing = false
    }

    return { conversationsSynced, messagesSynced }
  }

  /**
   * Push locally-queued messages to Supabase.
   * Queries WatermelonDB for messages with status='queued',
   * POSTs them to Supabase, and updates local status to 'sent' on success.
   *
   * @returns Count of messages pushed
   */
  async pushPendingMessages(): Promise<number> {
    const database = getDatabase()
    let pushedCount = 0

    // Find all locally-queued messages
    const queuedMessages = await database.collections
      .get<Message>('messages')
      .query(Q.where('status', 'queued'))
      .fetch()

    if (queuedMessages.length === 0) {
      return 0
    }

    console.log(`[MessageSync] Pushing ${queuedMessages.length} queued messages`)

    for (const localMsg of queuedMessages) {
      try {
        // Look up the conversation's server_id (need it for Supabase API)
        const conversationServerId = await this.resolveConversationServerId(localMsg.conversationId)
        if (!conversationServerId) {
          console.warn(`[MessageSync] Cannot push message: conversation ${localMsg.conversationId} has no server_id`)
          continue
        }

        // POST message to Supabase
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationServerId,
            org_id: localMsg.orgId,
            sender_id: localMsg.senderId,
            message_type: localMsg.messageType || 'text',
            content: localMsg.content || '',
            status: 'sent',
          } as any)
          .select()
          .single()

        if (error) {
          // Handle idempotency: if duplicate detected, treat as success
          if (error.code === '23505') {
            console.log(`[MessageSync] Duplicate message detected (idempotency), treating as success`)
            await database.write(async () => {
              await localMsg.update((record: any) => {
                record.status = 'sent'
              })
            })
            pushedCount++
            continue
          }
          console.error(`[MessageSync] Failed to push message ${localMsg.id}:`, error)
          continue // Leave as 'queued' for retry on next sync
        }

        // Update conversation metadata on server
        const content = localMsg.content || ''
        await supabase
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content.substring(0, 100),
          } as any)
          .eq('id', conversationServerId as any)

        // Upsert sender read status
        await supabase
          .from('conversation_read_status')
          .upsert(
            {
              user_id: localMsg.senderId,
              conversation_id: conversationServerId,
              org_id: localMsg.orgId,
              last_read_at: new Date().toISOString(),
            } as any,
            { onConflict: 'user_id,conversation_id' }
          )

        // Update local message: set server_id and status to 'sent'
        const serverMessageId = (data as any)?.id
        await database.write(async () => {
          await localMsg.update((record: any) => {
            if (serverMessageId) {
              record.serverId = serverMessageId
            }
            record.status = 'sent'
          })
        })

        pushedCount++
      } catch (error) {
        console.error(`[MessageSync] Error pushing message ${localMsg.id}:`, error)
        // Leave as 'queued' for retry on next sync
      }
    }

    console.log(`[MessageSync] Push complete: ${pushedCount}/${queuedMessages.length} messages sent`)
    return pushedCount
  }

  /**
   * Recompute unread counts for all local conversations.
   * Counts messages where sender_id != userId AND created_at > last_read_at.
   */
  private async recomputeUnreadCounts(userId: string, orgId: string): Promise<void> {
    const database = getDatabase()

    const conversations = await database.collections
      .get<Conversation>('conversations')
      .query(Q.where('org_id', orgId))
      .fetch()

    if (conversations.length === 0) return

    await database.write(async () => {
      const batchOps: any[] = []

      for (const conv of conversations) {
        // Get all messages in this conversation not sent by current user
        const lastReadAt = conv.lastReadAt || 0
        const unreadMessages = await database.collections
          .get<Message>('messages')
          .query(
            Q.where('conversation_id', conv.serverId || ''),
            Q.where('sender_id', Q.notEq(userId)),
            Q.where('created_at', Q.gt(lastReadAt))
          )
          .fetchCount()

        if (unreadMessages !== conv.unreadCount) {
          batchOps.push(
            conv.prepareUpdate((record: any) => {
              record.unreadCount = unreadMessages
            })
          )
        }
      }

      if (batchOps.length > 0) {
        await database.batch(...batchOps)
      }
    })
  }

  /**
   * Resolve a local conversation ID to its Supabase server_id.
   * Used by pushPendingMessages to POST messages to the correct server conversation.
   */
  private async resolveConversationServerId(localConversationId: string): Promise<string | null> {
    const database = getDatabase()

    try {
      // First try to find by WatermelonDB ID
      const conversation = await database.collections
        .get<Conversation>('conversations')
        .find(localConversationId)

      return conversation.serverId || null
    } catch {
      // Record not found by local ID -- try server_id directly
      // (conversationId on the message might already be a server_id)
      const results = await database.collections
        .get<Conversation>('conversations')
        .query(Q.where('server_id', localConversationId))
        .fetch()

      return results.length > 0 ? results[0].serverId || null : null
    }
  }

  /**
   * Load lastSyncedAt from AsyncStorage.
   */
  private async loadLastSyncedAt(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LAST_SYNCED_KEY)
      this.lastSyncedAt = stored ? parseInt(stored, 10) : 0
    } catch {
      this.lastSyncedAt = 0
    }
  }
}

// Export singleton instance
export const messageSync = new MessageSync()
