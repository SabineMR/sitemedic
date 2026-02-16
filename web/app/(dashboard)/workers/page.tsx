import { createClient } from '@/lib/supabase/server';
import { fetchWorkers } from '@/lib/queries/workers';
import { WorkersTable } from '@/components/dashboard/workers-table';

export default async function WorkersPage() {
  const supabase = await createClient();
  const workers = await fetchWorkers(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Worker Registry</h1>
        <p className="text-muted-foreground">
          {workers.length} worker{workers.length !== 1 ? 's' : ''} registered
        </p>
      </div>

      <WorkersTable initialData={workers} />
    </div>
  );
}
