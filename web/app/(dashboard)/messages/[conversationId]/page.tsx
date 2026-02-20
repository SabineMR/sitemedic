/**
 * Conversation Thread Page - Server Component
 *
 * Fetches conversation details, messages, and sidebar conversations
 * in parallel for the two-panel messaging layout.
 *
 * Phase 41: Web Messaging Core
 */

import { createClient } from '@/lib/supabase/server';
import {
  fetchConversationById,
  fetchMessagesForConversation,
  fetchConversationsWithUnread,
} from '@/lib/queries/comms';
import { redirect } from 'next/navigation';
import { ConversationList } from '../components/ConversationList';
import { MessageThread } from '../components/MessageThread';
import { MedicPicker } from '../components/MedicPicker';
import { BroadcastComposeDialog } from '../components/BroadcastComposeDialog';

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;
  const supabase = await createClient();

  // Get current user for role, org_id, and thread component
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = (user?.app_metadata?.org_id as string) ?? '';
  const role = (user?.app_metadata?.role as string) ?? '';

  // Fetch conversation details + messages + sidebar conversations + medic count in parallel
  const [conversation, messages, conversations, medicCountResult] =
    await Promise.all([
      fetchConversationById(supabase, conversationId),
      fetchMessagesForConversation(supabase, conversationId),
      fetchConversationsWithUnread(supabase),
      supabase
        .from('medics')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
    ]);

  const medicCount = medicCountResult.count ?? 0;

  if (!conversation) {
    redirect('/messages');
  }

  // Find participant name from conversations list (the one matching this conversation)
  const currentConversation = conversations.find(
    (c) => c.id === conversationId
  );
  const participantName =
    conversation.type === 'broadcast'
      ? 'Broadcasts'
      : currentConversation?.participant_name ?? 'Unknown';

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
      {/* Left panel: conversation list (hidden on mobile when viewing a thread) */}
      <div className="hidden md:flex w-80 min-w-80 border-r flex-col">
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
        <ConversationList
          initialConversations={conversations}
          selectedId={conversationId}
          orgId={orgId}
        />
      </div>

      {/* Right panel: message thread */}
      <div className="flex-1 flex flex-col">
        <MessageThread
          conversationId={conversationId}
          participantName={participantName}
          initialMessages={messages}
          currentUserId={user?.id ?? ''}
          conversationType={conversation.type as 'direct' | 'broadcast'}
          userRole={role}
        />
      </div>
    </div>
  );
}
