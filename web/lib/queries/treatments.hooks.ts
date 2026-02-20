'use client';

/**
 * Treatment client-side hooks
 *
 * TanStack Query hooks for treatments with polling.
 * Server-side fetch functions remain in treatments.ts.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { fetchTreatments } from './treatments';
import type { TreatmentWithWorker } from '@/types/database.types';

/**
 * TanStack Query hook for treatments (client-side)
 *
 * Provides 60-second polling for real-time updates per DASH-09 requirement.
 * Uses initialData from server component to avoid loading state on mount.
 */
export function useTreatments(initialData?: TreatmentWithWorker[]) {
  return useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const supabase = createBrowserClient();
      return fetchTreatments(supabase);
    },
    initialData,
    refetchInterval: 60_000, // 60 seconds
    refetchOnWindowFocus: true,
  });
}
