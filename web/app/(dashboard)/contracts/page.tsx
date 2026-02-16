/**
 * Contracts list page
 *
 * Admin dashboard for viewing all service agreements.
 * Shows contracts table with status filters, search, and actions.
 */

import { getContracts, getContractStats } from '@/lib/contracts/queries';
import { ContractsTable } from '@/components/contracts/contracts-table';

export default async function ContractsPage() {
  // Fetch contracts and stats in parallel
  const [contracts, stats] = await Promise.all([
    getContracts(),
    getContractStats(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Service Agreements</h1>
        <p className="text-muted-foreground">
          Manage client contracts and payment terms
        </p>
      </div>

      <ContractsTable contracts={contracts} stats={stats} />
    </div>
  );
}
