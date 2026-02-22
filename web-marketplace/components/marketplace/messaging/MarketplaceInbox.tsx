'use client';

import { MarketplaceMessageThread } from './MarketplaceMessageThread';

export function MarketplaceInbox({
  currentUserId,
  initialConversationId,
}: {
  currentUserId: string;
  initialConversationId?: string;
}) {
  if (!initialConversationId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        No conversation selected.
      </div>
    );
  }

  return (
    <div className="h-[600px] rounded-lg border border-gray-200 bg-white overflow-hidden">
      <MarketplaceMessageThread conversationId={initialConversationId} currentUserId={currentUserId} />
    </div>
  );
}
