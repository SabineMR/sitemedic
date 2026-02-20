/**
 * Message Input - Client Component
 *
 * Textarea with Enter-to-send (Shift+Enter for newline) and a visible
 * Send button. Auto-grows up to ~5 lines (160px) with overflow scroll.
 * Phase 47: Added attachment picker with pending file preview.
 *
 * Phase 41: Web Messaging Core
 * Phase 47: File attachment support
 */

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, X } from 'lucide-react';
import { AttachmentPicker } from './AttachmentPicker';
import { toast } from 'sonner';

interface MessageInputProps {
  conversationId: string;
  onMessageSent: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageInput({
  conversationId,
  onMessageSent,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = !sending && (content.trim().length > 0 || pendingFile !== null);

  const handleSend = async () => {
    if (!canSend) return;

    setSending(true);
    try {
      if (pendingFile) {
        // Upload attachment
        const formData = new FormData();
        formData.append('file', pendingFile);
        formData.append('conversationId', conversationId);
        if (content.trim()) {
          formData.append('content', content.trim());
        }

        const res = await fetch('/api/messages/attachments/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Failed to upload attachment:', errorData);
          toast.error(errorData.error || 'Failed to send attachment');
          return;
        }

        setContent('');
        setPendingFile(null);
        onMessageSent();
      } else {
        // Text-only message
        const trimmed = content.trim();
        if (!trimmed) return;

        const res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, content: trimmed }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Failed to send message:', errorData);
          return;
        }

        setContent('');
        onMessageSent();
      }

      // Auto-resize textarea back to default
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea as content grows (up to max-height of 160px)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  return (
    <div className="border-t bg-background">
      {/* Pending file preview */}
      {pendingFile && (
        <div className="px-3 pt-2">
          <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate flex-1">{pendingFile.name}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatFileSize(pendingFile.size)}
            </span>
            <button
              onClick={() => setPendingFile(null)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="flex gap-2 items-end">
          <AttachmentPicker
            onFileSelected={setPendingFile}
            disabled={sending}
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={pendingFile ? 'Add a caption (optional)...' : 'Type a message...'}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-h-40 overflow-y-auto"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className="h-9 w-9 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
