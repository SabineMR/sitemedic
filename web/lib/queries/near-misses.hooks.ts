'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchNearMisses } from './near-misses';
import type { NearMissWithReporter } from '@/types/database.types';

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
