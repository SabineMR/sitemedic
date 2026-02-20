'use client';

/**
 * MarketplaceMessageInput Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 02
 *
 * Text input with send button for marketplace messaging.
 * Enter to send, Shift+Enter for new line, max 5000 chars.
 */

import { useState, useCallback, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface MarketplaceMessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function MarketplaceMessageInput({
  onSend,
  disabled,
}: MarketplaceMessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setContent('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setSending(false);
    }
  }, [content, sending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const isDisabled = disabled || sending;

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          maxLength={5000}
          rows={1}
          placeholder="Type a message..."
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 max-h-[120px]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isDisabled || !content.trim()}
          className="flex-shrink-0 rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      {content.length > 4500 && (
        <p className="text-xs text-gray-400 text-right mt-1">
          {content.length} / 5000
        </p>
      )}
    </div>
  );
}
