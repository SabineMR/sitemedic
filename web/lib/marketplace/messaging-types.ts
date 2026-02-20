/**
 * Marketplace Messaging TypeScript Types
 * Phase 36: Ratings, Messaging & Disputes — Plan 02
 *
 * Types for per-event marketplace messaging between clients and companies.
 * Separate from internal org messaging (different RLS model: user_id vs org_id).
 */

// =============================================================================
// Database Row Interfaces
// =============================================================================

/** Mirrors marketplace_conversations table */
export interface MarketplaceConversation {
  id: string;
  event_id: string;
  company_id: string;
  client_user_id: string;
  company_user_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined/computed fields
  event_name?: string;
  company_name?: string;
  other_party_name?: string;
  unread_count?: number;
}

/** Mirrors marketplace_messages table */
export interface MarketplaceMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  // Joined field
  sender_name?: string;
}

/** Mirrors marketplace_conversation_read_status table */
export interface MarketplaceConversationReadStatus {
  user_id: string;
  conversation_id: string;
  last_read_at: string;
}

// =============================================================================
// API Request / Response Types
// =============================================================================

/** Request to create or get a conversation */
export interface CreateConversationRequest {
  event_id: string;
  company_id: string;
}

/** Request to send a message */
export interface SendMarketplaceMessageRequest {
  conversation_id: string;
  content: string;
}

/** Response for conversation list */
export interface MarketplaceConversationListResponse {
  conversations: MarketplaceConversation[];
}

/** Response for messages within a conversation */
export interface MarketplaceMessageListResponse {
  messages: MarketplaceMessage[];
  conversation: MarketplaceConversation;
}
