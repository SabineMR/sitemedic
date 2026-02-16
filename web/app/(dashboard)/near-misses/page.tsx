import { createServerClient } from '@/lib/supabase/server';
import { fetchNearMisses } from '@/lib/queries/near-misses';
import { NearMissesTable } from '@/components/dashboard/near-misses-table';

export default async function NearMissesPage() {
  const supabase = await createServerClient();
  const nearMisses = await fetchNearMisses(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Near-Miss Log</h1>
        <p className="text-muted-foreground">
          {nearMisses.length} near-miss{nearMisses.length !== 1 ? 'es' : ''} recorded
        </p>
      </div>

      <NearMissesTable initialData={nearMisses} />
    </div>
  );
}
