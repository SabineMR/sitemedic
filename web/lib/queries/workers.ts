import type { Worker, Treatment } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch workers (server-side)
 */
export async function fetchWorkers(supabase: SupabaseClient): Promise<Worker[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .is('deleted_at', null)
    .order('last_name', { ascending: true })
    .limit(500);

  if (error) {
    console.error(`Error fetching workers: message=${error.message}, code=${error.code}, details=${error.details}, hint=${error.hint}`);
    return [];
  }

  return data as Worker[];
}

/**
 * Fetch a single worker by ID (server-side)
 */
export async function fetchWorkerById(
  supabase: SupabaseClient,
  id: string
): Promise<Worker | null> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching worker:', error);
    return null;
  }

  return data as Worker;
}

/**
 * Fetch treatments for a specific worker (server-side)
 */
export async function fetchWorkerTreatments(
  supabase: SupabaseClient,
  workerId: string
): Promise<Treatment[]> {
  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('worker_id', workerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching worker treatments:', error);
    return [];
  }

  return data as Treatment[];
}

/**
 * Fetch consent records for a specific worker (server-side)
 */
export async function fetchWorkerConsentRecords(
  supabase: SupabaseClient,
  workerId: string
): Promise<Array<{
  id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  signature_uri: string | null;
  created_at: string;
}>> {
  const { data, error } = await supabase
    .from('consent_records')
    .select('id, consent_type, granted, granted_at, revoked_at, signature_uri, created_at')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching consent records:', error);
    return [];
  }

  return data || [];
}

