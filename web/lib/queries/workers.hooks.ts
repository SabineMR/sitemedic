'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchWorkers } from './workers';
import type { Worker } from '@/types/database.types';

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
