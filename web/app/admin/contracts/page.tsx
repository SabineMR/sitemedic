/**
 * Admin Contracts List Page
 *
 * Displays all service agreements with status filters, search, and actions.
 * Uses server-side data fetching for fast initial load.
 */

import { getContracts, getContractStats } from '@/lib/contracts/queries';
import { ContractsTable } from '@/components/contracts/contracts-table';

export default async function AdminContractsPage() {
  const [contracts, stats] = await Promise.all([
    getContracts(),
    getContractStats(),
  ]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-white">Service Agreements</h1>
        <p className="text-gray-400">
          Manage client contracts, payment terms, and templates
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <ContractsTable contracts={contracts} stats={stats} />
      </div>
    </div>
  );
}
