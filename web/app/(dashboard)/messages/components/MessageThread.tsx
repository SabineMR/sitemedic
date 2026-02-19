/**
 * Message Thread - Client Component
 *
 * Renders the message list with scroll-to-bottom, mark-as-read on mount,
 * and includes the MessageInput for sending new messages. Uses useMessages
 * hook for 10-second polling.
 *
 * Phase 41: Web Messaging Core
 */

'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/lib/queries/comms';
import type { MessageWithSender } from '@/types/comms.types';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

interface MessageThreadProps {
  conversationId: string;
  participantName: string;
  initialMessages: MessageWithSender[];
  currentUserId: string;
}

export function MessageThread({
  conversationId,
  participantName,
  initialMessages,
  currentUserId,
}: MessageThreadProps) {
  const { data: messages } = useMessages(conversationId, initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages?.length]);

  // Mark as read on mount
  useEffect(() => {
    fetch(`/api/messages/conversations/${conversationId}/read`, {
      method: 'PATCH',
    })
      .then(() => {
        // Invalidate conversations list to update unread counts
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .catch(console.error);
  }, [conversationId, queryClient]);

  // Handle successful message send
  const handleMessageSent = () => {
    // Invalidate both messages and conversations queries
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  return (
    <>
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
        {/* Back button (visible on mobile) */}
        <Link href="/messages" className="md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-sm font-semibold">{participantName}</h2>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages && messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Send the first message below.
          </div>
        )}
        {messages?.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwnMessage={message.sender_id === currentUserId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <MessageInput
        conversationId={conversationId}
        onMessageSent={handleMessageSent}
      />
    </>
  );
}
