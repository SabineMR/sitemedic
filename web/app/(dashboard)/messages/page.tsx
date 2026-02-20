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
import { BroadcastComposeDialog } from './components/BroadcastComposeDialog';

export default async function MessagesPage() {
  const supabase = await createClient();

  // Get current user for role detection
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = (user?.app_metadata?.role as 'org_admin' | 'medic') ?? null;
  const orgId = (user?.app_metadata?.org_id as string) ?? '';

  const [conversations, medicCountResult] = await Promise.all([
    fetchConversationsWithUnread(supabase),
    supabase
      .from('medics')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId),
  ]);

  const medicCount = medicCountResult.count ?? 0;

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
          <div className="flex items-center gap-2">
            {role === 'org_admin' && (
              <BroadcastComposeDialog medicCount={medicCount} />
            )}
            <MedicPicker
              existingConversationMedicIds={existingConversationMedicIds}
              existingConversations={existingConversations}
            />
          </div>
        </div>
        {conversations.length === 0 ? (
          <EmptyState
            role={role}
            existingConversationMedicIds={existingConversationMedicIds}
            existingConversations={existingConversations}
          />
        ) : (
          <ConversationList initialConversations={conversations} orgId={orgId} />
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
