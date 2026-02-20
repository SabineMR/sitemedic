/**
 * Conversation Search - Client Component
 *
 * Overlay panel for cross-conversation keyword search. Slides over
 * the conversation list, with debounced input and scrollable results.
 *
 * Phase 47: Message Polish
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useMessageSearch } from '@/lib/queries/comms.hooks';
import { SearchResultItem } from './SearchResultItem';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ConversationSearchProps {
  open: boolean;
  onClose: () => void;
}

export function ConversationSearch({ open, onClose }: ConversationSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setInputValue('');
      setDebouncedQuery('');
    }
  }, [open]);

  const { data: results, isFetching } = useMessageSearch(debouncedQuery);

  if (!open) return null;

  const trimmedQuery = debouncedQuery.trim();
  const showNoQuery = trimmedQuery.length === 0;
  const showTooShort = trimmedQuery.length === 1;
  const showNoResults =
    trimmedQuery.length >= 2 && !isFetching && results?.length === 0;
  const showResults = (results?.length ?? 0) > 0;

  return (
    <div className="absolute inset-0 z-10 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Search Messages</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search all messages..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9 h-9"
          />
          {isFetching && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {showNoQuery && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Type to search across all conversations
          </div>
        )}
        {showTooShort && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Enter at least 2 characters
          </div>
        )}
        {showNoResults && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No messages found for &quot;{trimmedQuery}&quot;
          </div>
        )}
        {showResults &&
          results?.map((result) => (
            <SearchResultItem
              key={result.id}
              result={result}
              onClick={onClose}
            />
          ))}
      </div>
    </div>
  );
}
