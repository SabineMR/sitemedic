'use client';

/**
 * MarketplaceMessageThread Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 02
 *
 * Chat-style message thread for marketplace conversations.
 * Messages from current user right-aligned (blue), other party left-aligned (gray).
 * Auto-scrolls to bottom on new messages. 10-second polling.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { MarketplaceMessageInput } from './MarketplaceMessageInput';
import type { MarketplaceMessage, MarketplaceConversation } from '@/lib/marketplace/messaging-types';

interface MarketplaceMessageThreadProps {
  conversationId: string;
  currentUserId: string;
  otherPartyName?: string;
  eventName?: string;
}

export function MarketplaceMessageThread({
  conversationId,
  currentUserId,
  otherPartyName,
  eventName,
}: MarketplaceMessageThreadProps) {
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [conversation, setConversation] = useState<MarketplaceConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/marketplace/messages/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setConversation(data.conversation || null);
      }
    } catch (err) {
      console.error('[MessageThread] Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Initial fetch + mark as read
  useEffect(() => {
    fetchMessages();
    // Mark as read
    fetch(`/api/marketplace/messages/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }).catch(() => {});
  }, [conversationId, fetchMessages]);

  // 10-second polling
  useEffect(() => {
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    const res = await fetch('/api/marketplace/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, content }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
    }
  };

  const displayName = otherPartyName || conversation?.other_party_name || conversation?.company_name || 'Other Party';
  const displayEvent = eventName || conversation?.event_name || 'Event';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 bg-white flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900">{displayName}</p>
        <p className="text-xs text-gray-500">{displayEvent}</p>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No messages yet. Send a message to start the conversation.
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isOwn && (
                    <p className={`text-xs font-medium mb-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.sender_name || displayName}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MarketplaceMessageInput onSend={handleSend} />
    </div>
  );
}
