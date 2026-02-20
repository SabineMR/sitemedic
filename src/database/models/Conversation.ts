import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export default class Conversation extends Model {
  static table = 'conversations'

  @field('server_id') serverId?: string // Supabase UUID, populated after sync
  @field('org_id') orgId!: string
  @field('type') type!: string // 'direct' | 'broadcast'
  @text('subject') subject?: string // for broadcast conversations
  @field('medic_id') medicId?: string // for direct conversations
  @field('created_by') createdBy!: string // user who created the conversation
  @field('last_message_at') lastMessageAt?: number // epoch ms of last message
  @text('last_message_preview') lastMessagePreview?: string // truncated last message content
  @text('participant_name') participantName?: string // denormalized name for display (avoids JOIN)
  @field('unread_count') unreadCount!: number // locally computed unread count (default 0)
  @field('last_read_at') lastReadAt?: number // epoch ms of current user's last read
  @field('created_at') createdAt!: number
  @field('updated_at') updatedAt!: number
}
