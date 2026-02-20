'use client';

/**
 * Marketplace Messages Page
 * Phase 36: Ratings, Messaging & Disputes — Plan 02
 *
 * Central inbox for all marketplace conversations.
 * URL query param ?conversation=xxx for deep linking from email notifications.
 */

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { MarketplaceInbox } from '@/components/marketplace/messaging/MarketplaceInbox';
import { Loader2 } from 'lucide-react';

export default function MarketplaceMessagesPage() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation') || undefined;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-gray-500">Please log in to view your messages.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>
      <MarketplaceInbox
        currentUserId={currentUserId}
        initialConversationId={conversationId}
      />
    </div>
  );
}
