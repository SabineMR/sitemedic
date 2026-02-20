/**
 * My Quotes Page — Company Quote Management Dashboard
 * Phase 34: Quote Submission & Comparison — Plan 03
 *
 * Route: /marketplace/my-quotes
 * Lists all quotes a company has submitted across events.
 * Features:
 * - Status filter tabs: All, Drafts, Submitted, Revised, Withdrawn
 * - Quote cards with edit/withdraw actions
 * - Edit dialog for in-place quote editing
 * - Empty state with link to Browse Events
 * - Loading skeleton
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import MyQuoteCard from '@/components/marketplace/quote-management/MyQuoteCard';
import EditQuoteDialog from '@/components/marketplace/quote-management/EditQuoteDialog';
import type { MyQuoteCardData } from '@/components/marketplace/quote-management/MyQuoteCard';

// =============================================================================
// Data fetching
// =============================================================================

interface MyQuotesResponse {
  success: boolean;
  quotes: MyQuoteCardData[];
  total: number;
  page: number;
  limit: number;
}

function useMyQuotesQuery(status: string) {
  return useQuery<MyQuotesResponse>({
    queryKey: ['my-marketplace-quotes', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      params.set('limit', '50');

      const res = await fetch(`/api/marketplace/quotes/my-quotes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch your quotes');
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// Page component
// =============================================================================

export default function MyQuotesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [editingQuote, setEditingQuote] = useState<MyQuoteCardData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useMyQuotesQuery(activeTab);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-marketplace-quotes'] });
  }, [queryClient]);

  const handleEdit = useCallback((quote: MyQuoteCardData) => {
    setEditingQuote(quote);
    setEditDialogOpen(true);
  }, []);

  const handleEditSaved = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <Link href="/events" className="text-blue-600 hover:text-blue-800">
          Marketplace
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">My Quotes</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Quotes</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage all your submitted quotes across events
          {data && data.total > 0 && (
            <span className="ml-1 text-gray-500">({data.total} total)</span>
          )}
        </p>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="revised">Revised</TabsTrigger>
          <TabsTrigger value="withdrawn">Withdrawn</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-5 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">Failed to load your quotes. Please try again later.</p>
        </div>
      )}

      {!isLoading && !error && data && data.quotes.length === 0 && (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'all'
              ? "You haven't submitted any quotes yet"
              : `No ${activeTab} quotes`}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Browse open events and submit your first quote to get started.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Browse Events
          </Link>
        </div>
      )}

      {!isLoading && !error && data && data.quotes.length > 0 && (
        <div className="space-y-3">
          {data.quotes.map((quote) => (
            <MyQuoteCard
              key={quote.id}
              quote={quote}
              onEdit={handleEdit}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {/* Edit Quote Dialog */}
      <EditQuoteDialog
        quote={editingQuote}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSaved={handleEditSaved}
      />
    </div>
  );
}
