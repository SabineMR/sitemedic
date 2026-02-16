/**
 * Dashboard Overview page
 *
 * Displays traffic-light compliance score and weekly summary statistics.
 * Data fetched server-side on initial load, then polls every 60 seconds client-side.
 *
 * DASH-01: Traffic-light compliance indicator
 * DASH-02: Compliance score breakdown (daily check, follow-ups, certs, RIDDOR)
 * DASH-03: Weekly stats (treatments, near-misses, workers, daily checks)
 * DASH-09: 60-second polling for near-real-time updates
 */

import { createClient } from '@/lib/supabase/server';
import { ComplianceScore } from '@/components/dashboard/compliance-score';
import { StatCard } from '@/components/dashboard/stat-card';
import { fetchComplianceData, fetchWeeklyStats } from '@/lib/queries/compliance';
import { Stethoscope, AlertTriangle, Users, ClipboardCheck } from 'lucide-react';

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  // Fetch initial data server-side (avoids loading state on first render)
  const [complianceData, weeklyStats] = await Promise.all([
    fetchComplianceData(supabase),
    fetchWeeklyStats(supabase),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Site compliance status and weekly activity summary
        </p>
      </div>

      {/* Compliance score section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <ComplianceScore initialData={complianceData} />
        </div>

        {/* Weekly stats grid */}
        <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Treatments This Week"
            value={weeklyStats.treatments}
            icon={Stethoscope}
            description="Total treatments logged"
          />
          <StatCard
            title="Near-Misses This Week"
            value={weeklyStats.nearMisses}
            icon={AlertTriangle}
            description="Safety incidents reported"
          />
          <StatCard
            title="Workers on Site"
            value={weeklyStats.workersOnSite}
            icon={Users}
            description="Unique workers seen this week"
          />
          <StatCard
            title="Daily Checks Completed"
            value={weeklyStats.dailyChecksCompleted}
            icon={ClipboardCheck}
            description="Passed safety checks"
          />
        </div>
      </div>
    </div>
  );
}
