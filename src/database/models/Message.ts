import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export default class Message extends Model {
  static table = 'messages'

  @field('server_id') serverId?: string // Supabase UUID
  @field('conversation_id') conversationId!: string // links to local conversation
  @field('org_id') orgId!: string
  @field('sender_id') senderId!: string // Supabase user UUID of sender
  @text('sender_name') senderName?: string // denormalized sender display name
  @field('message_type') messageType!: string // 'text' | 'attachment' | 'system'
  @text('content') content?: string // message text
  @field('status') status!: string // 'queued' | 'sent' | 'delivered' | 'read'
  @field('idempotency_key') idempotencyKey?: string // client-generated UUID for deduplication
  @field('created_at') createdAt!: number
  @field('updated_at') updatedAt!: number
}
