/**
 * Treatment data queries
 *
 * Server-side and client-side queries for treatments table.
 * Includes TanStack Query hooks with 60-second polling for real-time updates.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TreatmentWithWorker } from '@/types/database.types';

/**
 * Fetch treatments with worker info (server-side)
 *
 * Used in server components for initial data fetch.
 * Filters soft-deleted records and relies on RLS for org scoping.
 */
export async function fetchTreatments(
  supabase: SupabaseClient
): Promise<TreatmentWithWorker[]> {
  const { data, error } = await supabase
    .from('treatments')
    .select(
      `
      *,
      worker:workers(
        id,
        first_name,
        last_name,
        company
      )
    `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching treatments:', error);
    throw error;
  }

  return (data as any[]).map((treatment) => ({
    ...treatment,
    worker: treatment.worker || null,
  })) as TreatmentWithWorker[];
}

/**
 * Fetch single treatment by ID with full worker info (server-side)
 *
 * Used in treatment detail page for server-side rendering.
 */
export async function fetchTreatmentById(
  supabase: SupabaseClient,
  id: string
): Promise<TreatmentWithWorker | null> {
  const { data, error } = await supabase
    .from('treatments')
    .select(
      `
      *,
      worker:workers(*)
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching treatment:', error);
    return null;
  }

  return {
    ...data,
    worker: data.worker || null,
  } as TreatmentWithWorker;
}
