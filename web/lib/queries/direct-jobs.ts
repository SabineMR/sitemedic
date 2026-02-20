/**
 * Supabase Query Functions for Direct Jobs (Self-Procured)
 * Phase 34.1: Self-Procured Jobs — Plan 01
 *
 * Server-side query functions for direct jobs and client records.
 * Used by API routes in /api/direct-jobs/.
 *
 * These functions accept a typed Supabase client and return typed results.
 * They do NOT handle authentication — that is the API route's responsibility.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DirectJob, DirectClient } from '@/lib/direct-jobs/types';

// =============================================================================
// Direct Jobs Queries
// =============================================================================

interface FetchDirectJobsParams {
  companyId?: string;
  postedBy?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetch paginated list of direct jobs with client + event_days + staffing joined.
 * Filters to source='direct' only.
 */
export async function fetchDirectJobs(
  supabase: SupabaseClient,
  params: FetchDirectJobsParams
): Promise<PaginatedResult<DirectJob>> {
  const {
    companyId,
    postedBy,
    status,
    page = 1,
    limit = 20,
  } = params;

  const safeLimit = Math.min(limit, 100);
  const offset = (page - 1) * safeLimit;

  let query = supabase
    .from('marketplace_events')
    .select(
      '*, direct_clients(*), event_days(*), event_staffing_requirements(*)',
      { count: 'exact' }
    )
    .eq('source', 'direct');

  if (status) {
    query = query.eq('status', status);
  }

  if (postedBy) {
    query = query.eq('posted_by', postedBy);
  }

  if (companyId) {
    query = query.eq(
      'client_id',
      supabase
        .from('direct_clients')
        .select('id')
        .eq('company_id', companyId)
    );
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch direct jobs: ${error.message}`);
  }

  // Map the joined data to DirectJob shape
  const jobs: DirectJob[] = (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    client: row.direct_clients || null,
  })) as unknown as DirectJob[];

  return {
    data: jobs,
    total: count || 0,
    page,
    limit: safeLimit,
  };
}

/**
 * Fetch a single direct job by ID with all relations.
 * Verifies source='direct'.
 */
export async function fetchDirectJobById(
  supabase: SupabaseClient,
  jobId: string
): Promise<DirectJob | null> {
  const { data, error } = await supabase
    .from('marketplace_events')
    .select('*, direct_clients(*), event_days(*), event_staffing_requirements(*)')
    .eq('id', jobId)
    .eq('source', 'direct')
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    client: data.direct_clients || null,
  } as unknown as DirectJob;
}

// =============================================================================
// Direct Clients Queries
// =============================================================================

interface CreateDirectClientData {
  company_id: string;
  created_by: string;
  client_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postcode?: string | null;
  notes?: string | null;
}

/**
 * Create a new direct client record.
 * Returns the created client with ID.
 */
export async function createDirectClient(
  supabase: SupabaseClient,
  clientData: CreateDirectClientData
): Promise<DirectClient> {
  const { data, error } = await supabase
    .from('direct_clients')
    .insert({
      company_id: clientData.company_id,
      created_by: clientData.created_by,
      client_name: clientData.client_name,
      contact_name: clientData.contact_name || null,
      contact_email: clientData.contact_email || null,
      contact_phone: clientData.contact_phone || null,
      address_line_1: clientData.address_line_1 || null,
      address_line_2: clientData.address_line_2 || null,
      city: clientData.city || null,
      postcode: clientData.postcode || null,
      notes: clientData.notes || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create client: ${error?.message || 'Unknown error'}`);
  }

  return data as unknown as DirectClient;
}

/**
 * Fetch all clients for a company (for dropdown/autocomplete in wizard).
 * Ordered by client_name ascending.
 */
export async function fetchDirectClients(
  supabase: SupabaseClient,
  companyId: string
): Promise<DirectClient[]> {
  const { data, error } = await supabase
    .from('direct_clients')
    .select('*')
    .eq('company_id', companyId)
    .order('client_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch clients: ${error.message}`);
  }

  return (data || []) as unknown as DirectClient[];
}
