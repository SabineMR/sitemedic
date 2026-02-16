import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Worker } from '@/types/database.types';
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
    console.error('Error fetching workers:', error);
    return [];
  }

  return data as Worker[];
}

/**
 * Client-side hook for workers with polling
 */
export function useWorkers(initialData: Worker[]) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['workers'],
    queryFn: () => fetchWorkers(supabase),
    initialData,
    refetchInterval: 60_000, // 60 seconds
  });
}
