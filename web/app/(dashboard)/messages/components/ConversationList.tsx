/**
 * Conversation List - Client Component
 *
 * Renders a scrollable list of conversation rows with a search filter.
 * Uses useConversations hook for 30-second polling updates.
 *
 * Phase 41: Web Messaging Core
 */

'use client';

import { useState } from 'react';
import {
  useConversations,
  type ConversationListItem,
} from '@/lib/queries/comms';
import { ConversationRow } from './ConversationRow';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ConversationListProps {
  initialConversations: ConversationListItem[];
  selectedId?: string;
}

export function ConversationList({
  initialConversations,
  selectedId: externalSelectedId,
}: ConversationListProps) {
  const { data: conversations } = useConversations(initialConversations);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    externalSelectedId ?? null
  );

  // Filter conversations by participant name (local filter)
  const filtered =
    conversations?.filter((c) =>
      c.participant_name.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Scrollable conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedId === conversation.id}
            onClick={() => setSelectedId(conversation.id)}
          />
        ))}
        {filtered.length === 0 && search && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations matching &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
