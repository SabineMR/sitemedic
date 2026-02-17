/**
 * Compliance data hooks - Client-side only
 *
 * React Query hooks for client-side data fetching with 60-second polling.
 * For server-side data fetching, import from compliance.ts
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchComplianceData, fetchWeeklyStats } from './compliance';
import type { ComplianceData, WeeklyStats } from './compliance';

// Client-side: useComplianceData hook with 60-second polling
export function useComplianceData(initialData?: ComplianceData) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['compliance-data'],
    queryFn: () => fetchComplianceData(supabase),
    initialData,
    refetchInterval: 60_000, // 60 seconds
  });
}

// Client-side: useWeeklyStats hook with 60-second polling
export function useWeeklyStats(initialData?: WeeklyStats) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['weekly-stats'],
    queryFn: () => fetchWeeklyStats(supabase),
    initialData,
    refetchInterval: 60_000, // 60 seconds
  });
}
