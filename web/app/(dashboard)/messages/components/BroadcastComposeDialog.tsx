/**
 * BroadcastComposeDialog - Client Component
 *
 * Org admin can compose and send a broadcast message to all medics.
 * Uses Dialog for the compose form and AlertDialog for send confirmation.
 *
 * Phase 44: Broadcast Messaging
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Radio, Send, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface BroadcastComposeDialogProps {
  medicCount: number;
}

export function BroadcastComposeDialog({
  medicCount,
}: BroadcastComposeDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendClick = () => {
    if (!content.trim()) return;
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/messages/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Broadcast send error:', data.error);
        return;
      }

      const { conversationId } = await res.json();

      // Clear state and close dialogs
      setContent('');
      setShowConfirm(false);
      setOpen(false);

      // Invalidate conversations cache for updated list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Navigate to the broadcast conversation
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Broadcast send error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Radio className="h-4 w-4 mr-1" />
            Broadcast
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Broadcast</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              rows={4}
              placeholder="Type your broadcast message..."
              className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Will be sent to {medicCount} medic(s)
              </span>
              <Button
                size="sm"
                onClick={handleSendClick}
                disabled={!content.trim()}
              >
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send to {medicCount} medics?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This broadcast will be delivered to all medics in your
              organisation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                'Confirm Send'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
