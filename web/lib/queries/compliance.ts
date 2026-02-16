/**
 * Compliance data queries and weekly stats hooks
 *
 * Server-side data fetching for initial page load, client-side hooks for 60-second polling.
 * Compliance score evaluates: daily checks, overdue follow-ups, expired certs, RIDDOR deadlines.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types
export interface ComplianceData {
  dailyCheckDone: boolean;
  overdueFollowups: number;
  expiredCerts: number;
  riddorDeadlines: number;
}

export interface WeeklyStats {
  treatments: number;
  nearMisses: number;
  workersOnSite: number;
  dailyChecksCompleted: number;
}

export type ComplianceStatus = 'red' | 'amber' | 'green';

// Helper: Get Monday 00:00 of current week
export function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

// Server-side: Fetch compliance data
export async function fetchComplianceData(
  supabase: SupabaseClient
): Promise<ComplianceData> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  // Check if today's daily safety check is complete
  const { data: todayCheck } = await supabase
    .from('safety_checks')
    .select('overall_status')
    .eq('check_date', today)
    .is('deleted_at', null)
    .maybeSingle();

  const dailyCheckDone = todayCheck?.overall_status != null;

  // Count overdue follow-ups: treatments in last 7 days with hospital_referral or sent_home outcome
  const { count: overdueFollowups } = await supabase
    .from('treatments')
    .select('*', { count: 'exact', head: true })
    .in('outcome', ['hospital_referral', 'sent_home'])
    .gte('created_at', sevenDaysAgo)
    .is('deleted_at', null);

  // Expired certs: Hard-code 0 (cert tracking is Phase 7)
  const expiredCerts = 0;

  // RIDDOR deadlines: Count RIDDOR treatments created in last 15 days (15-day reporting window)
  const { count: riddorDeadlines } = await supabase
    .from('treatments')
    .select('*', { count: 'exact', head: true })
    .eq('is_riddor_reportable', true)
    .gte('created_at', fifteenDaysAgo)
    .is('deleted_at', null);

  return {
    dailyCheckDone,
    overdueFollowups: overdueFollowups || 0,
    expiredCerts,
    riddorDeadlines: riddorDeadlines || 0,
  };
}

// Server-side: Fetch weekly stats
export async function fetchWeeklyStats(
  supabase: SupabaseClient
): Promise<WeeklyStats> {
  const weekStart = getWeekStart();

  // Count treatments this week
  const { count: treatments } = await supabase
    .from('treatments')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart)
    .is('deleted_at', null);

  // Count near-misses this week
  const { count: nearMisses } = await supabase
    .from('near_misses')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart)
    .is('deleted_at', null);

  // Count distinct workers on site this week (from treatments)
  const { data: workersData } = await supabase
    .from('treatments')
    .select('worker_id')
    .gte('created_at', weekStart)
    .is('deleted_at', null);

  const uniqueWorkers = new Set(
    workersData?.filter((t) => t.worker_id).map((t) => t.worker_id)
  );
  const workersOnSite = uniqueWorkers.size;

  // Count completed daily checks this week (overall_status = 'pass')
  const { count: dailyChecksCompleted } = await supabase
    .from('safety_checks')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart)
    .eq('overall_status', 'pass')
    .is('deleted_at', null);

  return {
    treatments: treatments || 0,
    nearMisses: nearMisses || 0,
    workersOnSite,
    dailyChecksCompleted: dailyChecksCompleted || 0,
  };
}

// Calculate compliance status based on compliance data
export function calculateComplianceStatus(data: ComplianceData): ComplianceStatus {
  // RED: Daily check not done OR RIDDOR deadlines approaching
  if (!data.dailyCheckDone || data.riddorDeadlines > 0) {
    return 'red';
  }

  // AMBER: Overdue follow-ups OR expired certifications
  if (data.overdueFollowups > 0 || data.expiredCerts > 0) {
    return 'amber';
  }

  // GREEN: All clear
  return 'green';
}

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
