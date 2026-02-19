/**
 * Messages Page - Server Component
 *
 * Two-panel messaging layout: conversation list sidebar on the left,
 * message thread content area on the right.
 *
 * Phase 41: Web Messaging Core
 */

import { createClient } from '@/lib/supabase/server';
import { fetchConversationsWithUnread } from '@/lib/queries/comms';
import { ConversationList } from './components/ConversationList';
import { EmptyState } from './components/EmptyState';
import { MedicPicker } from './components/MedicPicker';

export default async function MessagesPage() {
  const supabase = await createClient();

  // Get current user for role detection
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = (user?.app_metadata?.role as 'org_admin' | 'medic') ?? null;

  const conversations = await fetchConversationsWithUnread(supabase);

  // Extract existing conversation data for MedicPicker duplicate prevention
  const existingConversationMedicIds = conversations
    .filter((c) => c.medic_id)
    .map((c) => c.medic_id!);
  const existingConversations = conversations.map((c) => ({
    medic_id: c.medic_id,
    id: c.id,
  }));

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.16)-theme(spacing.12))]">
      {/* Left panel: conversation list (~320px, or full-width on mobile) */}
      <div className="w-full md:w-80 md:min-w-80 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="text-lg font-semibold">Messages</h1>
          <MedicPicker
            existingConversationMedicIds={existingConversationMedicIds}
            existingConversations={existingConversations}
          />
        </div>
        {conversations.length === 0 ? (
          <EmptyState
            role={role}
            existingConversationMedicIds={existingConversationMedicIds}
            existingConversations={existingConversations}
          />
        ) : (
          <ConversationList initialConversations={conversations} />
        )}
      </div>

      {/* Right panel: message thread (empty state when no conversation selected) */}
      <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">Select a conversation</p>
          <p className="text-sm">
            Choose a conversation from the list to start messaging
          </p>
        </div>
      </div>
    </div>
  );
}
