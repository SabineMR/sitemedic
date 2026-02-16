/**
 * Treatment log page
 *
 * Server component that fetches initial treatment data and passes to
 * TreatmentsTable client component for interactive filtering and 60s polling.
 */

import { createClient } from '@/lib/supabase/server';
import { fetchTreatments } from '@/lib/queries/treatments';
import { TreatmentsTable } from '@/components/dashboard/treatments-table';

export default async function TreatmentsPage() {
  const supabase = await createClient();
  const treatments = await fetchTreatments(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Treatment Log</h1>
        <p className="text-muted-foreground">
          {treatments.length} treatment{treatments.length !== 1 ? 's' : ''} recorded
        </p>
      </div>

      <TreatmentsTable initialData={treatments} />
    </div>
  );
}
