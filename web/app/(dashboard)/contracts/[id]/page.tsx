/**
 * Contract detail page
 *
 * Admin view of individual contract with full details,
 * status timeline, version history, and actions.
 */

import { notFound, redirect } from 'next/navigation';
import { getContractById } from '@/lib/contracts/queries';
import { ContractDetail } from '@/components/contracts/contract-detail';
import { formatContractNumber } from '@/lib/contracts/utils';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface ContractDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({
  params,
}: ContractDetailPageProps) {
  const { id } = await params;

  // Fetch contract
  const contract = await getContractById(id);

  if (!contract) {
    notFound();
  }

  // Generate contract number
  const contractNumber = formatContractNumber(contract.id, contract.created_at);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/contracts" className="hover:text-foreground">
          Contracts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{contractNumber}</span>
      </div>

      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold">Agreement {contractNumber}</h1>
        <p className="text-muted-foreground">
          {contract.client?.name} - {contract.booking?.address_line1}
        </p>
      </div>

      {/* Contract detail component */}
      <ContractDetail contract={contract} />
    </div>
  );
}
