'use client';

import type { MarketplaceDispute } from '@/lib/marketplace/dispute-types';

export function DisputeDetail({ dispute }: { dispute: MarketplaceDispute }) {
  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
      <p className="font-medium text-gray-800">Dispute {dispute.id}</p>
      <p className="text-gray-600">Status: {dispute.status}</p>
      <p className="text-gray-600">Category: {dispute.category}</p>
    </div>
  );
}
