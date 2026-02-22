'use client';

import { useQuery } from '@tanstack/react-query';

interface IntegrityOverviewResponse {
  queue: {
    open: number;
    investigating: number;
    highRiskActive: number;
    integrityHolds: number;
    avgOpenAgeHours: number;
    slaBreaches: number;
    slaHours: number;
  };
}

async function fetchIntegrityOverview(): Promise<IntegrityOverviewResponse> {
  const response = await fetch('/api/platform/marketplace/integrity/overview', {
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Failed to load integrity overview');
  }

  return response.json();
}

export function IntegrityOverviewPanel() {
  const query = useQuery({
    queryKey: ['platform', 'marketplace', 'integrity-overview'],
    queryFn: fetchIntegrityOverview,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  if (query.isLoading) {
    return <div className="h-24 animate-pulse rounded-2xl border border-purple-700/40 bg-purple-900/20" />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-2xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
        Failed to load integrity overview
      </div>
    );
  }

  const queue = query.data.queue;

  return (
    <section className="grid gap-3 rounded-2xl border border-purple-700/40 bg-purple-900/20 p-4 md:grid-cols-3 xl:grid-cols-6">
      <Metric label="Open" value={queue.open} />
      <Metric label="Investigating" value={queue.investigating} />
      <Metric label="High Risk" value={queue.highRiskActive} />
      <Metric label="Holds" value={queue.integrityHolds} />
      <Metric label="Avg Age (h)" value={queue.avgOpenAgeHours} />
      <Metric
        label={`SLA Breaches (>${queue.slaHours}h)`}
        value={queue.slaBreaches}
        tone={queue.slaBreaches > 0 ? 'warn' : 'ok'}
      />
    </section>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'warn' | 'ok';
}) {
  return (
    <div className="rounded-xl border border-purple-700/35 bg-purple-800/20 p-3">
      <p className="text-[11px] uppercase tracking-wide text-purple-300">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          tone === 'warn' ? 'text-amber-200' : tone === 'ok' ? 'text-emerald-200' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
