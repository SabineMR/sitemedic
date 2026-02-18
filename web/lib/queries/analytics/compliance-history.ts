/**
 * Compliance History Query Hooks - Analytics Dashboard
 *
 * Provides TanStack Query hooks for:
 * 1. useComplianceHistory - Weekly compliance scores from compliance_score_history table
 * 2. useIncidentFrequency - Weekly treatment + near-miss counts over 12 months
 * 3. useAdminComplianceTrend - Aggregate compliance trend across all orgs (platform admin)
 * 4. useOrgComplianceRanking - Org ranking by compliance score (platform admin)
 *
 * RLS handles org filtering automatically on org-scoped hooks.
 * Platform admin hooks rely on admin RLS policy allowing all rows.
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

export interface AdminComplianceTrendPoint {
  period_end: string;
  avg_score: number;
  org_count: number;
  min_score: number;
  max_score: number;
}

export interface OrgComplianceRanking {
  org_id: string;
  org_name: string;
  latest_score: number;
  previous_score: number | null;
  trend: 'up' | 'down' | 'stable';
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

/**
 * useAdminComplianceTrend - Aggregate compliance trend across all organisations
 *
 * Platform admin hook — queries all compliance_score_history rows for vertical='general'
 * (no org filter; admin RLS policy allows access to all rows). Groups by period_end
 * client-side to compute avg/min/max/count. Returns last 52 periods sorted chronologically.
 */
export function useAdminComplianceTrend() {
  const supabase = createClient();

  return useQuery<AdminComplianceTrendPoint[]>({
    queryKey: ['admin-compliance-trend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_score_history')
        .select('period_end, score, org_id')
        .eq('vertical', 'general')
        .order('period_start', { ascending: true });

      if (error) {
        console.error('Error fetching admin compliance trend:', error);
        return [];
      }

      const rows = data ?? [];

      // Group by period_end client-side
      const periodMap = new Map<string, { scores: number[]; org_ids: Set<string> }>();
      rows.forEach((row) => {
        const key = row.period_end;
        const existing = periodMap.get(key) ?? { scores: [], org_ids: new Set() };
        existing.scores.push(row.score);
        existing.org_ids.add(row.org_id);
        periodMap.set(key, existing);
      });

      // Build result array sorted chronologically, last 52 periods
      const result: AdminComplianceTrendPoint[] = Array.from(periodMap.entries())
        .map(([period_end, { scores, org_ids }]) => {
          const avg_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          const min_score = Math.min(...scores);
          const max_score = Math.max(...scores);
          return {
            period_end,
            avg_score,
            org_count: org_ids.size,
            min_score,
            max_score,
          };
        })
        .sort((a, b) => a.period_end.localeCompare(b.period_end))
        .slice(-52);

      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * useOrgComplianceRanking - Organisation ranking by compliance score
 *
 * Platform admin hook — fetches all compliance_score_history rows for vertical='general'
 * ordered DESC (most recent first). Groups by org_id taking latest 2 scores per org.
 * Fetches org names from organizations table. Returns full ranked list sorted best to worst.
 */
export function useOrgComplianceRanking() {
  const supabase = createClient();

  return useQuery<OrgComplianceRanking[]>({
    queryKey: ['org-compliance-ranking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_score_history')
        .select('org_id, score, period_start')
        .eq('vertical', 'general')
        .order('period_start', { ascending: false });

      if (error) {
        console.error('Error fetching org compliance ranking:', error);
        return [];
      }

      const rows = data ?? [];

      // Group by org_id: take latest 2 scores per org (rows are DESC by period_start)
      const orgScoreMap = new Map<string, number[]>();
      rows.forEach((row) => {
        const existing = orgScoreMap.get(row.org_id) ?? [];
        if (existing.length < 2) {
          existing.push(row.score);
          orgScoreMap.set(row.org_id, existing);
        }
      });

      if (orgScoreMap.size === 0) return [];

      // Fetch org names from organizations table
      const uniqueOrgIds = Array.from(orgScoreMap.keys());
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', uniqueOrgIds);

      const orgNameMap = new Map<string, string>();
      (orgsData ?? []).forEach((org) => {
        orgNameMap.set(org.id, org.name ?? 'Unknown Organisation');
      });

      // Build ranking with trend
      const ranking: OrgComplianceRanking[] = Array.from(orgScoreMap.entries()).map(
        ([org_id, scores]) => {
          const latest_score = scores[0];
          const previous_score = scores.length > 1 ? scores[1] : null;
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (previous_score !== null) {
            if (latest_score > previous_score) trend = 'up';
            else if (latest_score < previous_score) trend = 'down';
          }
          return {
            org_id,
            org_name: orgNameMap.get(org_id) ?? 'Unknown Organisation',
            latest_score,
            previous_score,
            trend,
          };
        }
      );

      // Sort by latest_score DESC (top performers first)
      ranking.sort((a, b) => b.latest_score - a.latest_score);

      return ranking;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
