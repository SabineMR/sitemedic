'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BriefcaseBusiness, FileCheck2, Gavel, PoundSterling, TrendingUp } from 'lucide-react';
import {
  useMarketplaceAdminMetrics,
  type MarketplaceMetricsWindow,
} from '@/lib/queries/platform/marketplace-metrics';

const WINDOW_OPTIONS: Array<{ value: MarketplaceMetricsWindow; label: string }> = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'All time' },
];

const MARKETPLACE_METRICS_ENDPOINT = '/api/platform/marketplace/metrics';

function formatInteger(value: number): string {
  return value.toLocaleString('en-GB');
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatCurrency(value: number): string {
  return `GBP ${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PlatformMarketplaceDashboardPage() {
  const [window, setWindow] = useState<MarketplaceMetricsWindow>('30');
  const { data, isLoading, isError, error, refetch, isFetching } = useMarketplaceAdminMetrics(window);

  const metrics = data?.metrics;

  return (
    <div className="p-8 space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketplace Dashboard</h1>
          <p className="mt-2 text-sm text-purple-200">
            Track marketplace health, award conversion, and platform revenue in one place.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/platform/marketplace/entities"
              className="rounded-lg border border-purple-600/50 bg-purple-800/40 px-3 py-1.5 text-xs font-medium text-purple-100 hover:bg-purple-700/50"
            >
              Entity Ops
            </Link>
            <Link
              href="/platform/marketplace/settings"
              className="rounded-lg border border-purple-600/50 bg-purple-800/40 px-3 py-1.5 text-xs font-medium text-purple-100 hover:bg-purple-700/50"
            >
              Marketplace Settings
            </Link>
          </div>
        </div>

        <div className="flex gap-2 rounded-xl border border-purple-700/50 bg-purple-800/40 p-1">
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setWindow(option.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                window === option.value
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-200 hover:bg-purple-700/40 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-purple-700/40 bg-purple-800/30"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-700/50 bg-red-900/20 p-6">
          <div className="flex items-center gap-3 text-red-200">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Failed to load marketplace metrics</p>
          </div>
          <p className="mt-2 text-sm text-red-300">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-purple-700/50 bg-purple-800/30 p-5">
              <div className="flex items-center gap-2 text-purple-300">
                <BriefcaseBusiness className="h-4 w-4" />
                <span className="text-sm">Total Events Posted</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{formatInteger(metrics?.totalEventsPosted ?? 0)}</p>
            </article>

            <article className="rounded-2xl border border-purple-700/50 bg-purple-800/30 p-5">
              <div className="flex items-center gap-2 text-purple-300">
                <FileCheck2 className="h-4 w-4" />
                <span className="text-sm">Total Quotes Submitted</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{formatInteger(metrics?.totalQuotesSubmitted ?? 0)}</p>
            </article>

            <article className="rounded-2xl border border-purple-700/50 bg-purple-800/30 p-5">
              <div className="flex items-center gap-2 text-purple-300">
                <Gavel className="h-4 w-4" />
                <span className="text-sm">Awarded Events</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{formatInteger(metrics?.awardedEventsCount ?? 0)}</p>
            </article>

            <article className="rounded-2xl border border-purple-700/50 bg-purple-800/30 p-5">
              <div className="flex items-center gap-2 text-purple-300">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Conversion Rate</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{formatPercent(metrics?.conversionRatePercent ?? 0)}</p>
            </article>

            <article className="rounded-2xl border border-purple-700/50 bg-purple-800/30 p-5">
              <div className="flex items-center gap-2 text-purple-300">
                <PoundSterling className="h-4 w-4" />
                <span className="text-sm">Marketplace Revenue</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{formatCurrency(metrics?.marketplaceRevenueGbp ?? 0)}</p>
            </article>

            <article className="rounded-2xl border border-purple-700/50 bg-purple-800/30 p-5">
              <div className="flex items-center gap-2 text-purple-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Open Disputes</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-white">{formatInteger(metrics?.openDisputesCount ?? 0)}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-purple-700/50 bg-purple-800/25 p-6">
            <h2 className="text-lg font-semibold text-white">Market Health Snapshot</h2>
            <ul className="mt-4 space-y-3 text-sm text-purple-100">
              <li className="flex items-center justify-between rounded-lg border border-purple-700/40 bg-purple-900/20 px-4 py-3">
                <span>Quotes per event</span>
                <span className="font-semibold text-white">
                  {metrics && metrics.totalEventsPosted > 0
                    ? (metrics.totalQuotesSubmitted / metrics.totalEventsPosted).toFixed(2)
                    : '0.00'}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-lg border border-purple-700/40 bg-purple-900/20 px-4 py-3">
                <span>Unresolved disputes ratio</span>
                <span className="font-semibold text-white">
                  {metrics && metrics.awardedEventsCount > 0
                    ? `${((metrics.openDisputesCount / metrics.awardedEventsCount) * 100).toFixed(2)}%`
                    : '0.00%'}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-lg border border-purple-700/40 bg-purple-900/20 px-4 py-3">
                <span>Refresh status</span>
                <span className="font-semibold text-white">{isFetching ? 'Refreshing...' : 'Up to date'}</span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-purple-300">Data source: {MARKETPLACE_METRICS_ENDPOINT}</p>
          </section>
        </>
      )}
    </div>
  );
}
