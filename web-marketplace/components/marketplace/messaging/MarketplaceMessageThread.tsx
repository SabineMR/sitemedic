'use client';

export function MarketplaceMessageThread({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  return (
    <div className="h-full w-full p-4 text-sm text-gray-500">
      Messaging thread unavailable in this app build yet.
      <div className="mt-2 text-xs text-gray-400">Conversation: {conversationId} | User: {currentUserId}</div>
    </div>
  );
}
