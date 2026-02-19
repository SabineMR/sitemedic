/**
 * Empty State - Messages
 *
 * Shown when no conversations exist for the current user's org.
 * "Start a conversation" button is a visual placeholder, wired in 41-03.
 *
 * Phase 41: Web Messaging Core
 */

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No conversations yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-[240px]">
        Start a conversation with a medic or admin to get things moving.
      </p>
      {/* Button wired to new-conversation flow in 41-03 */}
      <Button variant="default" disabled>
        Start a conversation
      </Button>
    </div>
  );
}
