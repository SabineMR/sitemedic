import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { NearMissWithReporter } from '@/types/database.types';
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
    console.error('Error fetching near-misses:', error);
    return [];
  }

  return data as NearMissWithReporter[];
}

/**
 * Client-side hook for near-misses with polling
 */
export function useNearMisses(initialData: NearMissWithReporter[]) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['near-misses'],
    queryFn: () => fetchNearMisses(supabase),
    initialData,
    refetchInterval: 60_000, // 60 seconds
  });
}
