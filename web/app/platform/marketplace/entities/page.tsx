'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  useMarketplaceEntities,
  type MarketplaceEntityRecord,
  type MarketplaceEntityType,
} from '@/lib/queries/platform/marketplace-entities';
import { EntityModerationPanel } from '@/components/platform/marketplace/EntityModerationPanel';
import { IntegrityCasePanel } from '@/components/platform/marketplace/IntegrityCasePanel';
import { IntegrityOverviewPanel } from '@/components/platform/marketplace/IntegrityOverviewPanel';

const ENTITY_TABS: Array<{ value: MarketplaceEntityType; label: string }> = [
  { value: 'events', label: 'Events' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'awards', label: 'Awards' },
  { value: 'disputes', label: 'Disputes' },
  { value: 'users', label: 'Users' },
  { value: 'integrity', label: 'Integrity' },
];

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: number | null): string {
  if (value === null) return '-';
  return `GBP ${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusTone(status: string): string {
  if (
    status === 'open' ||
    status === 'active' ||
    status === 'awarded' ||
    status === 'resolved' ||
    status === 'resolved_dismissed' ||
    status === 'resolved_confirmed'
  ) {
    return 'bg-emerald-200/20 text-emerald-200 border-emerald-300/20';
  }
  if (status === 'under_review' || status === 'revised' || status === 'submitted') {
    return 'bg-blue-200/20 text-blue-200 border-blue-300/20';
  }
  if (status === 'investigating' || status === 'open') {
    return 'bg-orange-200/20 text-orange-200 border-orange-300/20';
  }
  if (status === 'suspended' || status === 'inactive' || status === 'cancelled' || status === 'withdrawn') {
    return 'bg-amber-200/20 text-amber-200 border-amber-300/20';
  }
  if (status === 'rejected' || status === 'ban') {
    return 'bg-red-200/20 text-red-200 border-red-300/20';
  }
  return 'bg-purple-200/20 text-purple-100 border-purple-300/20';
}

export default function MarketplaceEntityWorkspacePage() {
  const [entity, setEntity] = useState<MarketplaceEntityType>('events');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<MarketplaceEntityRecord | null>(null);
  const [selectedIntegrityCase, setSelectedIntegrityCase] = useState<MarketplaceEntityRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useMarketplaceEntities({
    entity,
    search,
    status,
    page,
    limit: 20,
  });

  const records = useMemo(() => query.data?.items || [], [query.data?.items]);
  const statusOptions = useMemo(() => query.data?.availableStatuses || ['all'], [query.data?.availableStatuses]);

  useEffect(() => {
    if (!statusOptions.includes(status)) {
      setStatus('all');
      setPage(1);
    }
  }, [status, statusOptions]);

  useEffect(() => {
    if (entity !== 'users') {
      setSelectedUser(null);
    } else {
      setSelectedUser((previous) => {
        if (!previous) return null;
        const next = records.find((row) => row.id === previous.id);
        return next || null;
      });
    }

    if (entity !== 'integrity') {
      setSelectedIntegrityCase(null);
    } else {
      setSelectedIntegrityCase((previous) => {
        if (!previous) return null;
        const next = records.find((row) => row.id === previous.id);
        return next || null;
      });
    }
  }, [entity, records]);

  const splitPanelEnabled = entity === 'users' || entity === 'integrity';

  const totalPages = query.data?.totalPages || 1;

  const tableRows = useMemo(() => {
    return records.map((row) => {
      const role = typeof row.metadata.role === 'string' ? row.metadata.role : null;
      const quoteCount =
        typeof row.metadata.quoteCount === 'number' ? String(row.metadata.quoteCount) : undefined;
      const riskBand = typeof row.metadata.riskBand === 'string' ? row.metadata.riskBand : null;
      const holdApplied = row.metadata.payoutHoldApplied === true ? 'hold applied' : null;

      return {
        ...row,
        tertiary: role || quoteCount || riskBand || holdApplied || null,
      };
    });
  }, [records]);

  return (
    <div className="p-8 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Marketplace Entity Operations</h1>
            <p className="mt-2 text-sm text-purple-200">
              Unified platform workspace for events, quotes, awards, disputes, and user moderation.
            </p>
          </div>
          <Link
            href="/platform/marketplace"
            className="rounded-lg border border-purple-600/50 bg-purple-800/40 px-4 py-2 text-sm font-medium text-purple-100 hover:bg-purple-700/50"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-purple-700/40 bg-purple-800/30 p-2">
          {ENTITY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setEntity(tab.value);
                setStatus('all');
                setPage(1);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                entity === tab.value
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-100 hover:bg-purple-700/40 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-purple-700/40 bg-purple-900/20 p-4">
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`Search ${entity}...`}
              className="w-full rounded-xl border border-purple-700/40 bg-purple-900/20 py-2 pl-9 pr-3 text-sm text-white placeholder:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </label>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-purple-700/40 bg-purple-900/20 px-3 py-2 text-sm text-white"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All statuses' : option.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </section>

      {entity === 'integrity' && <IntegrityOverviewPanel />}

      <div className={`grid gap-6 ${splitPanelEnabled ? 'xl:grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}>
        <section className="rounded-2xl border border-purple-700/40 bg-purple-900/20 overflow-hidden">
          {query.isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-lg bg-purple-700/30" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="flex items-center gap-3 p-6 text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <p>{query.error instanceof Error ? query.error.message : 'Failed to load entities'}</p>
            </div>
          ) : tableRows.length === 0 ? (
            <div className="p-8 text-center text-purple-200">No records match the current filters.</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-700/40 bg-purple-800/25 text-left text-xs uppercase tracking-wide text-purple-200">
                    <th className="px-4 py-3">Record</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-700/25">
                  {tableRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (entity === 'users') {
                          setSelectedUser(row);
                        } else if (entity === 'integrity') {
                          setSelectedIntegrityCase(row);
                        }
                      }}
                      className={`transition-colors ${
                        splitPanelEnabled
                          ? 'cursor-pointer hover:bg-purple-800/30'
                          : 'hover:bg-purple-800/20'
                      } ${selectedUser?.id === row.id || selectedIntegrityCase?.id === row.id ? 'bg-purple-700/30' : ''}`}
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-white">{row.primaryText}</p>
                        {row.secondaryText && <p className="text-xs text-purple-200 mt-1">{row.secondaryText}</p>}
                        {row.tertiary && <p className="text-xs text-purple-300 mt-1">{row.tertiary}</p>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusTone(
                            row.status
                          )}`}
                        >
                          {row.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-purple-100">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3 align-top text-purple-100">{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <footer className="flex items-center justify-between border-t border-purple-700/40 bg-purple-800/20 px-4 py-3 text-sm text-purple-200">
                <p>
                  Page {query.data?.page || page} of {totalPages} - {query.data?.total || 0} records
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-600/50 px-3 py-1.5 text-xs text-purple-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-600/50 px-3 py-1.5 text-xs text-purple-100 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>

        {entity === 'users' && selectedUser && (
          <EntityModerationPanel user={selectedUser} onActionComplete={() => query.refetch()} />
        )}

        {entity === 'integrity' && selectedIntegrityCase && (
          <IntegrityCasePanel caseRecord={selectedIntegrityCase} onActionComplete={() => query.refetch()} />
        )}
      </div>
    </div>
  );
}
