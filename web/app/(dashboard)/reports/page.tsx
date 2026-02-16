/**
 * Reports Page - Dashboard
 *
 * Weekly safety reports list with download and on-demand generation
 * Server-side data fetch for initial load, client-side polling for updates
 */

import { createClient } from '@/lib/supabase/server';
import { fetchReports } from '@/lib/queries/reports';
import { ReportsList } from '@/components/dashboard/reports-list';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = await createClient();

  // Fetch initial reports data server-side
  const initialReports = await fetchReports(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Weekly safety reports for HSE audits
        </p>
      </div>

      <ReportsList initialData={initialReports} />
    </div>
  );
}
