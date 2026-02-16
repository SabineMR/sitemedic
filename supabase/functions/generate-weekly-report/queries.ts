/**
 * Supabase data queries for weekly safety report
 * Phase 5: PDF Generation - Plan 01
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { WeeklyReportData, ComplianceScore } from './types.ts';

/**
 * Format date as UK format: "14 Feb 2026"
 */
function formatDateUK(dateString: string): string {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date as long UK format: "14 February 2026"
 */
function formatDateLongUK(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Calculate compliance score based on compliance data
 * Mirrors logic from web/lib/queries/compliance.ts
 */
function calculateComplianceStatus(
  dailyCheckDone: boolean,
  riddorDeadlines: number,
  overdueFollowups: number,
  expiredCerts: number
): 'red' | 'amber' | 'green' {
  // RED: Daily check not done OR RIDDOR deadlines approaching
  if (!dailyCheckDone || riddorDeadlines > 0) {
    return 'red';
  }

  // AMBER: Overdue follow-ups OR expired certifications
  if (overdueFollowups > 0 || expiredCerts > 0) {
    return 'amber';
  }

  // GREEN: All clear
  return 'green';
}

/**
 * Fetch all weekly report data from Supabase
 * Parallelize all queries for performance (<10 second constraint)
 */
export async function fetchWeeklyReportData(
  supabase: SupabaseClient,
  weekEnding: string // ISO date string
): Promise<WeeklyReportData> {
  console.log(`📊 Fetching weekly report data for week ending: ${weekEnding}`);

  // Calculate week start (7 days before week ending)
  const weekEndDate = new Date(weekEnding);
  const weekStartDate = new Date(weekEndDate);
  weekStartDate.setDate(weekStartDate.getDate() - 7);
  const weekStart = weekStartDate.toISOString();

  // Get today's date for compliance checks
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all data in parallel for performance
  const [
    orgResult,
    medicResult,
    treatmentsResult,
    nearMissesResult,
    safetyChecksResult,
    todayCheckResult,
    overdueFollowupsResult,
    riddorDeadlinesResult,
  ] = await Promise.all([
    // Organization name (project name)
    supabase.from('organizations').select('name').limit(1).single(),

    // Medic profile (single medic per org for MVP)
    supabase.from('profiles').select('full_name').limit(1).single(),

    // Treatments for the week (limit 50 per Research Pitfall 2)
    supabase
      .from('treatments')
      .select('created_at, injury_type, body_part, severity, outcome, is_riddor_reportable, worker_id')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnding)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),

    // Near-misses for the week (limit 50)
    supabase
      .from('near_misses')
      .select('created_at, category, severity, description, corrective_action')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnding)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),

    // Safety checks for the week
    supabase
      .from('safety_checks')
      .select('check_date, overall_status, items')
      .gte('check_date', weekStartDate.toISOString().split('T')[0])
      .lte('check_date', weekEndDate.toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('check_date', { ascending: true }),

    // Today's daily safety check (for compliance)
    supabase
      .from('safety_checks')
      .select('overall_status')
      .eq('check_date', today)
      .is('deleted_at', null)
      .maybeSingle(),

    // Overdue follow-ups count (treatments in last 7 days with hospital_referral or sent_home)
    supabase
      .from('treatments')
      .select('*', { count: 'exact', head: true })
      .in('outcome', ['hospital_referral', 'sent_home'])
      .gte('created_at', sevenDaysAgo)
      .is('deleted_at', null),

    // RIDDOR deadlines count (RIDDOR treatments in last 15 days)
    supabase
      .from('treatments')
      .select('*', { count: 'exact', head: true })
      .eq('is_riddor_reportable', true)
      .gte('created_at', fifteenDaysAgo)
      .is('deleted_at', null),
  ]);

  // Extract data
  const projectName = orgResult.data?.name || 'Unknown Organization';
  const medicName = medicResult.data?.full_name || 'Unknown Medic';
  const treatments = treatmentsResult.data || [];
  const nearMisses = nearMissesResult.data || [];
  const safetyChecks = safetyChecksResult.data || [];

  // Fetch worker names for treatments (batch lookup)
  const workerIds = [...new Set(treatments.map((t) => t.worker_id).filter(Boolean))];
  const workersMap = new Map<string, string>();

  if (workerIds.length > 0) {
    const { data: workers } = await supabase
      .from('workers')
      .select('id, first_name, last_name')
      .in('id', workerIds as string[]);

    workers?.forEach((worker) => {
      workersMap.set(worker.id, `${worker.first_name} ${worker.last_name}`);
    });
  }

  // Map treatments to rows
  const treatmentRows = treatments.map((t) => ({
    date: formatDateUK(t.created_at),
    workerName: t.worker_id ? workersMap.get(t.worker_id) || 'Unknown Worker' : 'Unknown Worker',
    injuryType: t.injury_type || 'Unknown',
    bodyPart: t.body_part || '-',
    severity: t.severity as 'minor' | 'moderate' | 'major' | 'critical',
    outcome: t.outcome as 'returned_to_work' | 'sent_home' | 'hospital_referral' | 'ambulance_called',
    isRiddor: t.is_riddor_reportable || false,
  }));

  // Map near-misses to rows
  const nearMissRows = nearMisses.map((nm) => ({
    date: formatDateUK(nm.created_at),
    category: nm.category || 'Unknown',
    severity: nm.severity as 'low' | 'medium' | 'high' | 'critical',
    description: (nm.description || 'No description').substring(0, 100) + (nm.description?.length > 100 ? '...' : ''),
    correctiveAction: nm.corrective_action || 'None recorded',
  }));

  // Map safety checks to rows
  const safetyCheckRows = safetyChecks.map((sc) => {
    // Parse items JSONB to count pass/fail
    const items = typeof sc.items === 'string' ? JSON.parse(sc.items) : sc.items;
    const itemsArray = Array.isArray(items) ? items : [];
    const passCount = itemsArray.filter((i: any) => i.status === 'pass').length;
    const failCount = itemsArray.filter((i: any) => i.status === 'fail').length;
    const totalItems = itemsArray.length;

    return {
      date: formatDateUK(sc.check_date),
      overallStatus: sc.overall_status as 'pass' | 'fail' | 'partial',
      passCount,
      failCount,
      totalItems,
    };
  });

  // Calculate compliance score
  const dailyCheckDone = todayCheckResult.data?.overall_status != null;
  const overdueFollowups = overdueFollowupsResult.count || 0;
  const expiredCerts = 0; // Hard-coded for Phase 7
  const riddorDeadlines = riddorDeadlinesResult.count || 0;

  const complianceScore: ComplianceScore = {
    status: calculateComplianceStatus(dailyCheckDone, riddorDeadlines, overdueFollowups, expiredCerts),
    dailyCheckDone,
    overdueFollowups,
    expiredCerts,
    riddorDeadlines,
  };

  // Calculate weekly stats
  const uniqueWorkers = new Set(treatments.map((t) => t.worker_id).filter(Boolean));
  const dailyChecksCompleted = safetyChecks.filter((sc) => sc.overall_status === 'pass').length;
  const dailyChecksRequired = 5; // 5 working days per week

  const weeklyStats = {
    treatmentCount: treatments.length,
    nearMissCount: nearMisses.length,
    workersOnSite: uniqueWorkers.size,
    dailyChecksCompleted,
    dailyChecksRequired,
  };

  console.log(`✅ Fetched report data: ${treatments.length} treatments, ${nearMisses.length} near-misses, ${safetyChecks.length} checks`);

  return {
    projectName,
    weekEnding: formatDateLongUK(weekEnding),
    medicName,
    generatedAt: new Date().toISOString(),
    complianceScore,
    treatments: treatmentRows,
    nearMisses: nearMissRows,
    safetyChecks: safetyCheckRows,
    weeklyStats,
  };
}
