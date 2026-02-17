/**
 * Analytics Query Hooks - Admin Analytics Dashboard
 *
 * TanStack Query hooks for fetching analytics data:
 * - Auto-assignment success rate (weekly trend, last 12 weeks)
 * - Medic utilisation (per medic, percentage)
 * - Late arrival patterns (by medic and day-of-week)
 * - Out-of-territory bookings (frequency and cost)
 *
 * Key patterns:
 * - All queries include .eq('org_id', orgId) for multi-tenant isolation
 * - All functions return empty/zero defaults — never null/undefined
 * - staleTime: 60000, refetchInterval: 300000 (consistent with territories.ts)
 * - Parallel queries (Promise.all) to avoid N+1 issues
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';

// =============================================================================
// TYPES
// =============================================================================

export interface WeeklyAssignmentStats {
  week_start: string; // ISO date string, Monday of the week
  week_label: string; // Human-readable label e.g. "W7 2026"
  total_attempts: number;
  successful: number;
  failed: number;
  success_rate: number; // 0–100
  avg_confidence: number; // 0–100
  top_failure_reason: string | null;
}

export interface MedicUtilisation {
  medic_id: string;
  medic_name: string;
  utilisation_pct: number; // 0–100 (capped)
  booked_days: number; // bookings confirmed/in_progress this week
  available_days: number; // always 5 (Mon–Fri working week)
  total_shifts_completed: number;
  territory_count: number;
  is_available: boolean;
}

export interface LateArrivalPattern {
  medic_id: string;
  medic_name: string;
  day_of_week: number; // 0=Sun, 1=Mon … 6=Sat
  day_label: string; // "Monday", "Tuesday", etc.
  late_count: number;
}

export interface LateArrivalSummary {
  patterns: LateArrivalPattern[];
  total_late_arrivals: number;
  worst_day: string; // day label, or "N/A" if no data
  worst_medic: string; // medic name, or "N/A" if no data
}

export interface OutOfTerritoryBooking {
  id: string;
  medic_id: string;
  site_postcode: string;
  shift_date: string;
  out_of_territory_cost: number;
  out_of_territory_type: 'travel_bonus' | 'room_board' | null;
}

export interface OOTSummary {
  bookings: OutOfTerritoryBooking[];
  total_oot_bookings: number;
  total_extra_cost: number;
  oot_percentage: number; // % of all bookings that are OOT
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get ISO week label from a Date, e.g. "W7 2026"
 */
function getISOWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `W${weekNo} ${d.getUTCFullYear()}`;
}

/**
 * Get the Monday of the ISO week that contains the given date.
 * Returns an ISO date string (YYYY-MM-DD).
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

const DAY_LABELS: string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// =============================================================================
// FETCH: AUTO-ASSIGNMENT STATS
// =============================================================================

/**
 * Fetch weekly auto-assignment success/failure stats for the last 12 weeks.
 *
 * Queries auto_schedule_logs directly — the table has its own org_id column.
 * Groups results by ISO week and aggregates totals, success rate, and confidence.
 */
export async function fetchAutoAssignmentStats(
  supabase: SupabaseClient,
  orgId: string
): Promise<WeeklyAssignmentStats[]> {
  const since = new Date();
  since.setDate(since.getDate() - 84); // 12 weeks = 84 days
  const sinceISO = since.toISOString();

  const { data, error } = await supabase
    .from('auto_schedule_logs')
    .select('id, created_at, status, confidence_score, failure_reason')
    .eq('org_id', orgId) // CRITICAL: multi-tenant isolation
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching auto_schedule_logs:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by ISO week
  const weekMap = new Map<
    string,
    {
      week_start: string;
      attempts: number;
      successful: number;
      failed: number;
      confidence_sum: number;
      confidence_count: number;
      failure_reasons: Record<string, number>;
    }
  >();

  data.forEach((row) => {
    const date = new Date(row.created_at);
    const weekStart = getWeekStart(date);

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, {
        week_start: weekStart,
        attempts: 0,
        successful: 0,
        failed: 0,
        confidence_sum: 0,
        confidence_count: 0,
        failure_reasons: {},
      });
    }

    const week = weekMap.get(weekStart)!;
    week.attempts += 1;

    if (row.status === 'assigned' || row.status === 'success') {
      week.successful += 1;
    } else {
      week.failed += 1;
      if (row.failure_reason) {
        week.failure_reasons[row.failure_reason] =
          (week.failure_reasons[row.failure_reason] || 0) + 1;
      }
    }

    if (typeof row.confidence_score === 'number') {
      week.confidence_sum += row.confidence_score;
      week.confidence_count += 1;
    }
  });

  // Convert map to sorted array
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, w]) => {
      const successRate =
        w.attempts > 0 ? Math.round((w.successful / w.attempts) * 100) : 0;
      const avgConfidence =
        w.confidence_count > 0
          ? Math.round(w.confidence_sum / w.confidence_count)
          : 0;

      // Find most common failure reason
      let topFailureReason: string | null = null;
      let maxCount = 0;
      for (const [reason, count] of Object.entries(w.failure_reasons)) {
        if (count > maxCount) {
          maxCount = count;
          topFailureReason = reason;
        }
      }

      return {
        week_start: weekStart,
        week_label: getISOWeekLabel(new Date(weekStart)),
        total_attempts: w.attempts,
        successful: w.successful,
        failed: w.failed,
        success_rate: successRate,
        avg_confidence: avgConfidence,
        top_failure_reason: topFailureReason,
      };
    });
}

// =============================================================================
// FETCH: MEDIC UTILISATION
// =============================================================================

/**
 * Fetch per-medic utilisation for the current working week.
 *
 * Utilisation = (confirmed/in_progress bookings this week / 5 working days) × 100
 * Capped at 100%.
 *
 * Uses Promise.all for parallel queries — avoids N+1.
 */
export async function fetchMedicUtilisation(
  supabase: SupabaseClient,
  orgId: string
): Promise<MedicUtilisation[]> {
  // Calculate current week boundaries (Monday–Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mondayStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];

  // Parallel queries for medics, bookings this week, and territories
  const [medicsResult, bookingsResult, territoriesResult] = await Promise.all([
    supabase
      .from('medics')
      .select(
        'id, first_name, last_name, available_for_work, total_shifts_completed'
      )
      .eq('org_id', orgId) // CRITICAL: multi-tenant isolation
      .order('last_name', { ascending: true }),

    supabase
      .from('bookings')
      .select('medic_id')
      .eq('org_id', orgId) // CRITICAL: multi-tenant isolation
      .in('status', ['confirmed', 'in_progress'])
      .gte('shift_date', mondayStr)
      .lte('shift_date', sundayStr),

    supabase
      .from('territories')
      .select('primary_medic_id, secondary_medic_id')
      .eq('org_id', orgId), // CRITICAL: multi-tenant isolation
  ]);

  if (medicsResult.error) {
    console.error('Error fetching medics for utilisation:', medicsResult.error);
    return [];
  }

  const medics = medicsResult.data || [];
  if (medics.length === 0) {
    return [];
  }

  // Count bookings this week per medic
  const bookingsCountByMedic = new Map<string, number>();
  (bookingsResult.data || []).forEach((b) => {
    if (b.medic_id) {
      bookingsCountByMedic.set(
        b.medic_id,
        (bookingsCountByMedic.get(b.medic_id) || 0) + 1
      );
    }
  });

  // Count territory assignments per medic
  const territoriesCountByMedic = new Map<string, number>();
  (territoriesResult.data || []).forEach((t) => {
    if (t.primary_medic_id) {
      territoriesCountByMedic.set(
        t.primary_medic_id,
        (territoriesCountByMedic.get(t.primary_medic_id) || 0) + 1
      );
    }
    if (t.secondary_medic_id) {
      territoriesCountByMedic.set(
        t.secondary_medic_id,
        (territoriesCountByMedic.get(t.secondary_medic_id) || 0) + 1
      );
    }
  });

  const result: MedicUtilisation[] = medics.map((medic) => {
    const bookedDays = bookingsCountByMedic.get(medic.id) || 0;
    const utilisationPct = Math.min(100, (bookedDays / 5) * 100);

    return {
      medic_id: medic.id,
      medic_name: `${medic.first_name} ${medic.last_name}`,
      utilisation_pct: Math.round(utilisationPct),
      booked_days: bookedDays,
      available_days: 5,
      total_shifts_completed: medic.total_shifts_completed || 0,
      territory_count: territoriesCountByMedic.get(medic.id) || 0,
      is_available: medic.available_for_work ?? true,
    };
  });

  // Sort by utilisation descending
  return result.sort((a, b) => b.utilisation_pct - a.utilisation_pct);
}

// =============================================================================
// FETCH: LATE ARRIVAL PATTERNS
// =============================================================================

/**
 * Fetch late arrival patterns from medic_alerts.
 *
 * Groups by medic_id + day_of_week to identify problematic patterns.
 * Returns "N/A" for worst_day / worst_medic when no data exists.
 */
export async function fetchLateArrivalPatterns(
  supabase: SupabaseClient,
  orgId: string
): Promise<LateArrivalSummary> {
  const empty: LateArrivalSummary = {
    patterns: [],
    total_late_arrivals: 0,
    worst_day: 'N/A',
    worst_medic: 'N/A',
  };

  const { data: alerts, error: alertsError } = await supabase
    .from('medic_alerts')
    .select('id, medic_id, created_at')
    .eq('alert_type', 'late_arrival')
    .eq('org_id', orgId) // CRITICAL: multi-tenant isolation
    .order('created_at', { ascending: true });

  if (alertsError) {
    console.error('Error fetching medic_alerts:', alertsError);
    return empty;
  }

  if (!alerts || alerts.length === 0) {
    return empty;
  }

  // Collect unique medic IDs to look up names
  const medicIds = [...new Set(alerts.map((a) => a.medic_id).filter(Boolean))];

  const { data: medics, error: medicsError } = await supabase
    .from('medics')
    .select('id, first_name, last_name')
    .eq('org_id', orgId) // CRITICAL: multi-tenant isolation
    .in('id', medicIds);

  if (medicsError) {
    console.error('Error fetching medics for late arrivals:', medicsError);
    // Proceed without names (will use IDs as fallback)
  }

  const medicNamesById = new Map<string, string>();
  (medics || []).forEach((m) => {
    medicNamesById.set(m.id, `${m.first_name} ${m.last_name}`);
  });

  // Group by medic_id + day_of_week
  const patternMap = new Map<string, { medic_id: string; day_of_week: number; count: number }>();

  alerts.forEach((alert) => {
    if (!alert.medic_id) return;
    const date = new Date(alert.created_at);
    const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
    const key = `${alert.medic_id}:${dayOfWeek}`;

    const existing = patternMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      patternMap.set(key, { medic_id: alert.medic_id, day_of_week: dayOfWeek, count: 1 });
    }
  });

  const patterns: LateArrivalPattern[] = Array.from(patternMap.values()).map(
    (p) => ({
      medic_id: p.medic_id,
      medic_name: medicNamesById.get(p.medic_id) || p.medic_id,
      day_of_week: p.day_of_week,
      day_label: DAY_LABELS[p.day_of_week],
      late_count: p.count,
    })
  );

  const totalLateArrivals = alerts.length;

  // Find worst day (most late arrivals)
  const dayTotals = new Map<number, number>();
  patterns.forEach((p) => {
    dayTotals.set(p.day_of_week, (dayTotals.get(p.day_of_week) || 0) + p.late_count);
  });

  let worstDay = 'N/A';
  let worstDayCount = 0;
  dayTotals.forEach((count, day) => {
    if (count > worstDayCount) {
      worstDayCount = count;
      worstDay = DAY_LABELS[day];
    }
  });

  // Find worst medic (most late arrivals)
  const medicTotals = new Map<string, { name: string; count: number }>();
  patterns.forEach((p) => {
    const existing = medicTotals.get(p.medic_id);
    if (existing) {
      existing.count += p.late_count;
    } else {
      medicTotals.set(p.medic_id, { name: p.medic_name, count: p.late_count });
    }
  });

  let worstMedic = 'N/A';
  let worstMedicCount = 0;
  medicTotals.forEach(({ name, count }) => {
    if (count > worstMedicCount) {
      worstMedicCount = count;
      worstMedic = name;
    }
  });

  return {
    patterns,
    total_late_arrivals: totalLateArrivals,
    worst_day: worstDay,
    worst_medic: worstMedic,
  };
}

// =============================================================================
// FETCH: OUT-OF-TERRITORY BOOKINGS
// =============================================================================

/**
 * Fetch bookings where out-of-territory cost was applied.
 *
 * Uses .gt('out_of_territory_cost', 0) — NOT travel_bonus (column does not exist).
 * Calculates oot_percentage relative to all bookings for the org.
 */
export async function fetchOutOfTerritoryBookings(
  supabase: SupabaseClient,
  orgId: string
): Promise<OOTSummary> {
  const empty: OOTSummary = {
    bookings: [],
    total_oot_bookings: 0,
    total_extra_cost: 0,
    oot_percentage: 0,
  };

  // Fetch OOT bookings and total booking count in parallel
  const [ootResult, totalResult] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        'id, medic_id, site_postcode, shift_date, out_of_territory_cost, out_of_territory_type'
      )
      .eq('org_id', orgId) // CRITICAL: multi-tenant isolation
      .gt('out_of_territory_cost', 0)
      .order('shift_date', { ascending: false }),

    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId), // CRITICAL: multi-tenant isolation
  ]);

  if (ootResult.error) {
    console.error('Error fetching OOT bookings:', ootResult.error);
    return empty;
  }

  const ootBookings = ootResult.data || [];
  const totalCount = totalResult.count ?? 0;

  if (ootBookings.length === 0) {
    return empty;
  }

  const bookings: OutOfTerritoryBooking[] = ootBookings.map((b) => ({
    id: b.id,
    medic_id: b.medic_id,
    site_postcode: b.site_postcode,
    shift_date: b.shift_date,
    out_of_territory_cost: b.out_of_territory_cost,
    out_of_territory_type: b.out_of_territory_type as
      | 'travel_bonus'
      | 'room_board'
      | null,
  }));

  const totalExtraCost = bookings.reduce(
    (sum, b) => sum + (b.out_of_territory_cost || 0),
    0
  );

  const ootPercentage =
    totalCount > 0
      ? Math.round((bookings.length / totalCount) * 100 * 10) / 10
      : 0;

  return {
    bookings,
    total_oot_bookings: bookings.length,
    total_extra_cost: totalExtraCost,
    oot_percentage: ootPercentage,
  };
}

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================

/**
 * useAutoAssignmentStats
 *
 * Fetches weekly auto-assignment success rate for the last 12 weeks.
 * Polls every 5 minutes (300s). Considers data stale after 60s.
 */
export function useAutoAssignmentStats() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'analytics', 'auto-assignment-stats', orgId],
    queryFn: () => fetchAutoAssignmentStats(supabase, orgId),
    staleTime: 60000,
    refetchInterval: 300000,
  });
}

/**
 * useMedicUtilisation
 *
 * Fetches per-medic utilisation for the current working week.
 * Polls every 5 minutes. Considers data stale after 60s.
 */
export function useMedicUtilisation() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'analytics', 'medic-utilisation', orgId],
    queryFn: () => fetchMedicUtilisation(supabase, orgId),
    staleTime: 60000,
    refetchInterval: 300000,
  });
}

/**
 * useLateArrivalPatterns
 *
 * Fetches late arrival alert patterns grouped by medic and day-of-week.
 * Polls every 5 minutes. Considers data stale after 60s.
 */
export function useLateArrivalPatterns() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'analytics', 'late-arrival-patterns', orgId],
    queryFn: () => fetchLateArrivalPatterns(supabase, orgId),
    staleTime: 60000,
    refetchInterval: 300000,
  });
}

/**
 * useOutOfTerritoryBookings
 *
 * Fetches bookings with out-of-territory costs and calculates summary stats.
 * Polls every 5 minutes. Considers data stale after 60s.
 */
export function useOutOfTerritoryBookings() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'analytics', 'out-of-territory', orgId],
    queryFn: () => fetchOutOfTerritoryBookings(supabase, orgId),
    staleTime: 60000,
    refetchInterval: 300000,
  });
}
