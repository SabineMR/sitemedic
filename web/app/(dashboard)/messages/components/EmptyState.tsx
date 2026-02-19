/**
 * Empty State - Messages
 *
 * Shown when no conversations exist for the current user's org.
 * Renders the MedicPicker for admin or "Message Admin" for medic.
 *
 * Phase 41: Web Messaging Core
 */

'use client';

import { MessageSquare } from 'lucide-react';
import { MedicPicker } from './MedicPicker';

interface EmptyStateProps {
  role: 'org_admin' | 'medic' | null;
  existingConversationMedicIds: string[];
  existingConversations: Array<{ medic_id: string | null; id: string }>;
}

export function EmptyState({
  role,
  existingConversationMedicIds,
  existingConversations,
}: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No conversations yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-[240px]">
        {role === 'medic'
          ? 'Send a message to your admin to get started.'
          : 'Start a conversation with a medic to get things moving.'}
      </p>
      <MedicPicker
        existingConversationMedicIds={existingConversationMedicIds}
        existingConversations={existingConversations}
      />
    </div>
  );
}
