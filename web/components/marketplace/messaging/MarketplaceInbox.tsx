'use client';

/**
 * MarketplaceInbox Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 02
 *
 * Two-panel inbox layout: conversation list (left) + message thread (right).
 * Mobile: single panel with back navigation.
 * 30-second polling for conversation list refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, MessageSquare, ArrowLeft } from 'lucide-react';
import { MarketplaceConversationRow } from './MarketplaceConversationRow';
import { MarketplaceMessageThread } from './MarketplaceMessageThread';
import type { MarketplaceConversation } from '@/lib/marketplace/messaging-types';

interface MarketplaceInboxProps {
  currentUserId: string;
  initialConversationId?: string;
}

export function MarketplaceInbox({
  currentUserId,
  initialConversationId,
}: MarketplaceInboxProps) {
  const [conversations, setConversations] = useState<MarketplaceConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId || null
  );

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/messages/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('[MarketplaceInbox] Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 30-second polling
  useEffect(() => {
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-center px-4">
        <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No conversations yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Messages from marketplace events will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Left panel: Conversation list */}
      <div
        className={`w-full md:w-80 md:border-r border-gray-200 flex-shrink-0 overflow-y-auto ${
          activeConversationId ? 'hidden md:block' : ''
        }`}
      >
        {conversations.map((conv) => (
          <MarketplaceConversationRow
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeConversationId}
            onClick={() => setActiveConversationId(conv.id)}
          />
        ))}
      </div>

      {/* Right panel: Message thread */}
      <div
        className={`flex-1 flex flex-col ${
          activeConversationId ? '' : 'hidden md:flex'
        }`}
      >
        {activeConversationId ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden border-b border-gray-200 px-3 py-2">
              <button
                type="button"
                onClick={() => setActiveConversationId(null)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            <MarketplaceMessageThread
              conversationId={activeConversationId}
              currentUserId={currentUserId}
              otherPartyName={activeConversation?.other_party_name}
              eventName={activeConversation?.event_name}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                Select a conversation to view messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
