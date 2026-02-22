'use client';

import { Clock3, Link2 } from 'lucide-react';
import type { AttributionChainResponse } from '@/lib/marketplace/attribution/types';

const STATE_LABELS: Record<string, string> = {
  solo: 'SOLO',
  pass_on_pending: 'PASS-ON Pending',
  pass_on_accepted: 'PASS-ON Accepted',
  pass_on_declined: 'PASS-ON Declined',
};

export function AttributionChainTimeline({ chain }: { chain: AttributionChainResponse }) {
  return (
    <section className="border rounded-lg p-5">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-gray-500" />
        Attribution Chain
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <span className="text-gray-500">Lifecycle</span>
          <p className="font-medium mt-0.5">{STATE_LABELS[chain.lifecycleState] || chain.lifecycleState}</p>
        </div>
        <div>
          <span className="text-gray-500">Source Provenance</span>
          <p className="font-medium mt-0.5">{chain.sourceProvenance}</p>
        </div>
        <div>
          <span className="text-gray-500">Fee Policy</span>
          <p className="font-medium mt-0.5">{chain.feePolicy}</p>
        </div>
        <div>
          <span className="text-gray-500">Current Responsible Company</span>
          <p className="font-medium mt-0.5">{chain.currentResponsibleCompanyId || 'Unknown'}</p>
        </div>
      </div>

      {chain.custodyTimeline.length === 0 ? (
        <p className="text-sm text-gray-500">No custody events recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {chain.custodyTimeline.map((entry) => (
            <li key={entry.id} className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{entry.event_type}</span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  {new Date(entry.created_at).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Actor: {entry.actor_user_id}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
