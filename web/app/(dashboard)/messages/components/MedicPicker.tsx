/**
 * MedicPicker - Client Component
 *
 * Admin flow: Dialog with org medic roster, search filter, and existing
 * conversation indicators. Clicking a medic creates or opens a conversation.
 *
 * Medic flow: Simple "Message Admin" button that creates or opens
 * a conversation with the org admin.
 *
 * Phase 41: Web Messaging Core
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, MessageSquare, Loader2 } from 'lucide-react';

interface Medic {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  has_conversation: boolean;
  conversation_id: string | null;
}

interface MedicPickerProps {
  existingConversationMedicIds: string[];
  existingConversations: Array<{ medic_id: string | null; id: string }>;
}

export function MedicPicker({
  existingConversationMedicIds,
  existingConversations,
}: MedicPickerProps) {
  const router = useRouter();
  const { role } = useOrg();
  const [open, setOpen] = useState(false);
  const [medics, setMedics] = useState<Medic[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  // Fetch medics when dialog opens (admin flow)
  useEffect(() => {
    if (!open || role !== 'org_admin') return;

    async function loadMedics() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('medics')
        .select('id, user_id, first_name, last_name')
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Error loading medics:', error);
        setLoading(false);
        return;
      }

      // Mark medics that already have conversations
      const medicList: Medic[] = (data || []).map((m) => {
        const existingConv = existingConversations.find(
          (c) => c.medic_id === m.id
        );
        return {
          ...m,
          has_conversation: existingConversationMedicIds.includes(m.id),
          conversation_id: existingConv?.id ?? null,
        };
      });

      setMedics(medicList);
      setLoading(false);
    }

    loadMedics();
  }, [open, role, existingConversationMedicIds, existingConversations]);

  // Handle medic selection (admin flow)
  const handleSelectMedic = async (medic: Medic) => {
    // If conversation already exists, navigate to it
    if (medic.has_conversation && medic.conversation_id) {
      setOpen(false);
      router.push(`/messages/${medic.conversation_id}`);
      return;
    }

    // Create new conversation
    setCreating(medic.id);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicId: medic.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to create conversation:', data.error);
        return;
      }

      const { conversationId } = await res.json();
      setOpen(false);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Error creating conversation:', err);
    } finally {
      setCreating(null);
    }
  };

  // Handle medic's "Message Admin" flow
  const handleMessageAdmin = async () => {
    setCreating('admin');
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to create conversation:', data.error);
        return;
      }

      const { conversationId } = await res.json();
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Error creating conversation:', err);
    } finally {
      setCreating(null);
    }
  };

  // Medic flow: simple button, no dialog
  if (role === 'medic') {
    return (
      <Button
        onClick={handleMessageAdmin}
        disabled={creating === 'admin'}
        size="sm"
      >
        {creating === 'admin' ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <MessageSquare className="h-4 w-4 mr-1" />
        )}
        Message Admin
      </Button>
    );
  }

  // Admin flow: dialog with medic picker
  const filtered = medics.filter((m) =>
    `${m.first_name} ${m.last_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Medic list */}
        <div className="max-h-72 overflow-y-auto -mx-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              {search ? 'No medics found' : 'No medics in your organisation'}
            </div>
          )}
          {!loading &&
            filtered.map((medic) => (
              <button
                key={medic.id}
                onClick={() => handleSelectMedic(medic)}
                disabled={creating === medic.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 rounded-md transition-colors text-left"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {medic.first_name.charAt(0)}
                    {medic.last_name.charAt(0)}
                  </span>
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">
                    {medic.first_name} {medic.last_name}
                  </span>
                </div>
                {/* Existing conversation indicator */}
                {medic.has_conversation && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Existing
                  </span>
                )}
                {creating === medic.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
