/**
 * Admin Contract Detail Page
 *
 * Shows individual contract with details, payment schedule,
 * status timeline, version history, and actions.
 */

import { notFound } from 'next/navigation';
import { getContractById } from '@/lib/contracts/queries';
import { ContractDetail } from '@/components/contracts/contract-detail';
import { formatContractNumber } from '@/lib/contracts/utils';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface AdminContractDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminContractDetailPage({
  params,
}: AdminContractDetailPageProps) {
  const { id } = await params;
  const contract = await getContractById(id);

  if (!contract) {
    notFound();
  }

  const contractNumber = formatContractNumber(contract.id, contract.created_at);

  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin" className="hover:text-white">
          Admin
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/admin/contracts" className="hover:text-white">
          Contracts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">{contractNumber}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Agreement {contractNumber}
        </h1>
        <p className="text-gray-400">
          {contract.client?.name} - {contract.booking?.address_line1}
        </p>
      </div>

      {/* Contract detail */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <ContractDetail contract={contract} />
      </div>
    </div>
  );
}
