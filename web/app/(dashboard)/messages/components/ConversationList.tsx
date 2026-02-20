/**
 * Conversation List - Client Component
 *
 * Renders a scrollable list of conversation rows with a search filter.
 * Uses Supabase Realtime for live updates (polling removed in Phase 43).
 * Phase 47: Added cross-conversation search overlay toggle.
 *
 * Phase 41: Web Messaging Core
 * Phase 43: Replaced 30s polling with Realtime subscription
 * Phase 47: Cross-conversation search integration
 */

'use client';

import { useState } from 'react';
import {
  useConversations,
  useRealtimeMessages,
  type ConversationListItem,
} from '@/lib/queries/comms.hooks';
import { ConversationRow } from './ConversationRow';
import { ConversationSearch } from './ConversationSearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SearchCode } from 'lucide-react';

interface ConversationListProps {
  initialConversations: ConversationListItem[];
  selectedId?: string;
  orgId: string;
}

export function ConversationList({
  initialConversations,
  selectedId: externalSelectedId,
  orgId,
}: ConversationListProps) {
  const { data: conversations } = useConversations(initialConversations);

  // Establish Realtime subscription for live message updates
  useRealtimeMessages(orgId);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    externalSelectedId ?? null
  );

  // Filter conversations by participant name (local filter)
  const filtered =
    conversations?.filter((c) =>
      c.participant_name.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  return (
    <div className="relative flex flex-col flex-1 overflow-hidden">
      {/* Search bar */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => setSearchOpen(true)}
            title="Search all messages"
          >
            <SearchCode className="h-4 w-4" />
          </Button>
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

      {/* Cross-conversation search overlay */}
      <ConversationSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
