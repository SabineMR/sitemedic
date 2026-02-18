/**
 * Compliance History Query Hooks - Analytics Dashboard
 *
 * Provides TanStack Query hooks for:
 * 1. useComplianceHistory - Weekly compliance scores from compliance_score_history table
 * 2. useIncidentFrequency - Weekly treatment + near-miss counts over 12 months
 *
 * RLS handles org filtering automatically on both hooks.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { startOfWeek, format, subMonths } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

export interface ComplianceScorePoint {
  period_end: string;
  score: number;
  details: Record<string, unknown> | null;
}

export interface IncidentFrequencyPoint {
  week_label: string;
  week_start: string;
  treatments: number;
  near_misses: number;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * useComplianceHistory - Fetch weekly compliance scores for the org
 *
 * Queries compliance_score_history for vertical='general' (org-wide sentinel).
 * Returns up to 52 weeks of data ordered chronologically.
 * RLS policy ensures only the current org's rows are returned.
 */
export function useComplianceHistory() {
  const supabase = createClient();

  return useQuery<ComplianceScorePoint[]>({
    queryKey: ['compliance-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_score_history')
        .select('period_end, score, details')
        .eq('vertical', 'general')
        .order('period_start', { ascending: true })
        .limit(52);

      if (error) {
        console.error('Error fetching compliance history:', error);
        return [];
      }

      return (data ?? []) as ComplianceScorePoint[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * useIncidentFrequency - Fetch weekly treatment + near-miss counts for last 12 months
 *
 * Parallel fetches treatments and near_misses tables, then buckets by ISO week
 * (week starts Monday). Returns sorted chronologically.
 *
 * near_misses: all non-deleted rows in the date range count regardless of GPS.
 */
export function useIncidentFrequency() {
  const supabase = createClient();

  return useQuery<IncidentFrequencyPoint[]>({
    queryKey: ['incident-frequency'],
    queryFn: async () => {
      const twelveMonthsAgo = subMonths(new Date(), 12).toISOString();

      // Parallel fetch treatments and near_misses
      const [treatmentsResult, nearMissesResult] = await Promise.all([
        supabase
          .from('treatments')
          .select('created_at, id')
          .gte('created_at', twelveMonthsAgo)
          .is('deleted_at', null),
        supabase
          .from('near_misses')
          .select('created_at, id')
          .gte('created_at', twelveMonthsAgo)
          .is('deleted_at', null),
      ]);

      if (treatmentsResult.error) {
        console.error('Error fetching treatments for incident frequency:', treatmentsResult.error);
      }
      if (nearMissesResult.error) {
        console.error('Error fetching near_misses for incident frequency:', nearMissesResult.error);
      }

      const treatments = treatmentsResult.data ?? [];
      const nearMisses = nearMissesResult.data ?? [];

      // Bucket by week (Monday start)
      const weekMap = new Map<string, { treatments: number; near_misses: number }>();

      const getWeekKey = (dateStr: string): string => {
        const date = new Date(dateStr);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        return weekStart.toISOString();
      };

      treatments.forEach((t) => {
        const key = getWeekKey(t.created_at);
        const existing = weekMap.get(key) ?? { treatments: 0, near_misses: 0 };
        weekMap.set(key, { ...existing, treatments: existing.treatments + 1 });
      });

      nearMisses.forEach((n) => {
        const key = getWeekKey(n.created_at);
        const existing = weekMap.get(key) ?? { treatments: 0, near_misses: 0 };
        weekMap.set(key, { ...existing, near_misses: existing.near_misses + 1 });
      });

      // Build result array sorted by week_start ASC
      const result: IncidentFrequencyPoint[] = Array.from(weekMap.entries())
        .map(([weekStartISO, counts]) => {
          const weekDate = new Date(weekStartISO);
          return {
            week_label: format(weekDate, "'W'I MMM"),
            week_start: weekStartISO,
            treatments: counts.treatments,
            near_misses: counts.near_misses,
          };
        })
        .sort((a, b) => a.week_start.localeCompare(b.week_start));

      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
