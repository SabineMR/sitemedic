import type { NearMissWithReporter } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch near-misses (server-side)
 */
export async function fetchNearMisses(supabase: SupabaseClient): Promise<NearMissWithReporter[]> {
  const { data, error } = await supabase
    .from('near_misses')
    .select('*, reporter:profiles(id, full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error(`Error fetching near-misses: message=${error.message}, code=${error.code}, details=${error.details}, hint=${error.hint}`);
    return [];
  }

  return data as NearMissWithReporter[];
}
