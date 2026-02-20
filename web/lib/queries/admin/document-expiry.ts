/**
 * Admin Document Expiry Query Hooks
 * Phase 46-02: Expiry Tracking & Alerts - Bulk Dashboard
 *
 * TanStack Query hooks for fetching document expiry data with org-scoped filtering,
 * summary aggregation, and category listing for the bulk expiry dashboard.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';
import { differenceInDays, parseISO } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

export interface ExpiringDocumentRow {
  document_id: string;
  medic_id: string;
  medic_name: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  file_name: string;
  expiry_date: string;
  days_remaining: number;
  status: 'current' | 'expiring-soon' | 'expired';
}

export interface DocumentExpirySummary {
  total_documents: number;
  expired_count: number;
  expiring_soon_count: number;
  current_count: number;
}

export interface DocumentCategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface FetchExpiringDocumentsOptions {
  daysWindow: number;
  categorySlug?: string;
  includeExpired?: boolean;
}

// =============================================================================
// SERVER FUNCTIONS
// =============================================================================

/**
 * Fetch documents with expiry dates for an org, with filtering options.
 *
 * Queries documents table with joins to medics, document_categories, and
 * document_versions (via fk_documents_current_version). Client-side filtering
 * computes days_remaining and applies daysWindow/category/expired filters.
 */
export async function fetchExpiringDocuments(
  supabase: SupabaseClient,
  orgId: string,
  options: FetchExpiringDocumentsOptions
): Promise<ExpiringDocumentRow[]> {
  const { daysWindow, categorySlug, includeExpired = false } = options;

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      medic_id,
      category_id,
      status,
      medics!documents_medic_id_fkey (first_name, last_name),
      document_categories!documents_category_id_fkey (name, slug),
      document_versions!fk_documents_current_version (
        id, expiry_date, file_name
      )
    `)
    .eq('org_id', orgId)
    .neq('status', 'archived')
    .not('current_version_id', 'is', null);

  if (error) {
    console.error('Error fetching expiring documents:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  const today = new Date();
  const results: ExpiringDocumentRow[] = [];

  for (const doc of data) {
    // Extract joined data - Supabase returns single objects for to-one relations
    const medic = doc.medics as unknown as { first_name: string; last_name: string } | null;
    const category = doc.document_categories as unknown as { name: string; slug: string } | null;
    const version = doc.document_versions as unknown as { id: string; expiry_date: string | null; file_name: string } | null;

    if (!medic || !category || !version) continue;

    // Skip documents without expiry dates (no-expiry documents excluded from dashboard)
    if (!version.expiry_date) continue;

    // Apply category filter if provided
    if (categorySlug && category.slug !== categorySlug) continue;

    const expiryDate = parseISO(version.expiry_date);
    const daysRemaining = differenceInDays(expiryDate, today);

    // Determine status
    let status: 'current' | 'expiring-soon' | 'expired';
    if (daysRemaining < 0) {
      status = 'expired';
    } else if (daysRemaining <= 30) {
      status = 'expiring-soon';
    } else {
      status = 'current';
    }

    // Apply daysWindow/includeExpired filter
    let include = false;
    if (status === 'expired') {
      include = includeExpired;
    } else {
      include = daysRemaining <= daysWindow;
    }

    if (include) {
      results.push({
        document_id: doc.id,
        medic_id: doc.medic_id,
        medic_name: `${medic.first_name} ${medic.last_name}`,
        category_id: doc.category_id,
        category_name: category.name,
        category_slug: category.slug,
        file_name: version.file_name,
        expiry_date: version.expiry_date,
        days_remaining: daysRemaining,
        status,
      });
    }
  }

  // Sort by days_remaining ascending (most urgent first)
  results.sort((a, b) => a.days_remaining - b.days_remaining);

  return results;
}

/**
 * Fetch aggregate document expiry summary for an org.
 *
 * Computes total documents with expiry dates, and counts of expired,
 * expiring-soon (0-30 days), and current (>30 days) documents.
 */
export async function fetchDocumentExpirySummary(
  supabase: SupabaseClient,
  orgId: string
): Promise<DocumentExpirySummary> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      document_versions!fk_documents_current_version (
        expiry_date
      )
    `)
    .eq('org_id', orgId)
    .neq('status', 'archived')
    .not('current_version_id', 'is', null);

  if (error) {
    console.error('Error fetching document expiry summary:', error);
    throw error;
  }

  const today = new Date();
  let total_documents = 0;
  let expired_count = 0;
  let expiring_soon_count = 0;
  let current_count = 0;

  for (const doc of data || []) {
    const version = doc.document_versions as unknown as { expiry_date: string | null } | null;
    if (!version?.expiry_date) continue;

    total_documents++;
    const daysRemaining = differenceInDays(parseISO(version.expiry_date), today);

    if (daysRemaining < 0) {
      expired_count++;
    } else if (daysRemaining <= 30) {
      expiring_soon_count++;
    } else {
      current_count++;
    }
  }

  return {
    total_documents,
    expired_count,
    expiring_soon_count,
    current_count,
  };
}

/**
 * Fetch active document categories for an org.
 */
export async function fetchDocumentCategories(
  supabase: SupabaseClient,
  orgId: string
): Promise<DocumentCategoryOption[]> {
  const { data, error } = await supabase
    .from('document_categories')
    .select('id, name, slug')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching document categories:', error);
    throw error;
  }

  return (data || []) as DocumentCategoryOption[];
}

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================

/**
 * Query hook for expiring documents within a time window.
 *
 * @param daysWindow - Number of days to look ahead (30, 365, etc.)
 * @param categorySlug - Optional category slug to filter by
 * @param includeExpired - Whether to include already-expired documents
 */
export function useExpiringDocuments(
  daysWindow: number,
  categorySlug?: string,
  includeExpired?: boolean
) {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'documents', 'expiring', orgId, daysWindow, categorySlug, includeExpired],
    queryFn: () => fetchExpiringDocuments(supabase, orgId, { daysWindow, categorySlug, includeExpired }),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * Query hook for document expiry summary (aggregate counts).
 */
export function useDocumentExpirySummary() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'documents', 'expiry-summary', orgId],
    queryFn: () => fetchDocumentExpirySummary(supabase, orgId),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * Query hook for document categories (filter dropdown).
 * Longer stale time since categories rarely change.
 */
export function useDocumentCategories() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'document-categories', orgId],
    queryFn: () => fetchDocumentCategories(supabase, orgId),
    staleTime: 300000, // 5 min - categories rarely change
  });
}
