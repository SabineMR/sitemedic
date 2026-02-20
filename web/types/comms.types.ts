/**
 * v5.0 Internal Comms & Document Management TypeScript types
 *
 * Manual type definitions matching the Supabase schema from
 * 143_comms_docs_schema.sql and 144_comms_docs_storage.sql
 *
 * Phase 40: Comms & Docs Foundation
 */

// -- Messaging Types --------------------------------------------------------

export type ConversationType = 'direct' | 'broadcast';
export type MessageType = 'text' | 'attachment' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Conversation {
  id: string;
  org_id: string;
  type: ConversationType;
  subject: string | null;
  medic_id: string | null;
  created_by: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  org_id: string;
  sender_id: string;
  message_type: MessageType;
  content: string | null;
  metadata: Record<string, unknown> | null;
  status: MessageStatus;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRecipient {
  id: string;
  message_id: string;
  recipient_id: string;
  org_id: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ConversationReadStatus {
  user_id: string;
  conversation_id: string;
  org_id: string;
  last_read_at: string;
}

// -- Document Management Types ----------------------------------------------

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'archived';

export interface DocumentCategory {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  medic_id: string;
  category_id: string;
  current_version_id: string | null;
  status: DocumentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  org_id: string;
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  notes: string | null;
  version_number: number;
  uploaded_by: string;
  created_at: string;
}

// -- Convenience / Derived Types --------------------------------------------

/** Conversation with computed unread count (used in conversation list) */
export interface ConversationWithUnread extends Conversation {
  unread_count: number;
}

/** Message with sender profile info (used in message thread display) */
export interface MessageWithSender extends Message {
  sender_name: string;
  sender_role: string | null;
}

/** Document with current version details (used in document profile views) */
export interface DocumentWithVersion extends Document {
  category_name: string;
  category_slug: string;
  current_version: DocumentVersion | null;
}

/** Broadcast read tracking summary (used in admin broadcast view) */
export interface BroadcastReadSummary {
  message_id: string;
  total_recipients: number;
  read_count: number;
  delivered_count: number;
}

/** Individual recipient detail for broadcast drilldown (admin view) */
export interface BroadcastRecipientDetail {
  recipient_id: string;
  name: string;
  read_at: string | null;
  status: 'read' | 'unread';
}
