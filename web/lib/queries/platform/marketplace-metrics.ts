'use client';

import { useQuery } from '@tanstack/react-query';

export type MarketplaceMetricsWindow = '7' | '30' | '90' | 'all';

export interface MarketplaceAdminMetrics {
  totalEventsPosted: number;
  totalQuotesSubmitted: number;
  awardedEventsCount: number;
  conversionRatePercent: number;
  marketplaceRevenueGbp: number;
  openDisputesCount: number;
}

export interface MarketplaceAdminMetricsResponse {
  window: MarketplaceMetricsWindow;
  metrics: MarketplaceAdminMetrics;
}

export const MARKETPLACE_METRICS_API_PATH = '/api/platform/marketplace/metrics';

async function fetchMarketplaceAdminMetrics(
  window: MarketplaceMetricsWindow
): Promise<MarketplaceAdminMetricsResponse> {
  const response = await fetch(`${MARKETPLACE_METRICS_API_PATH}?window=${window}`);

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error || 'Failed to fetch marketplace admin metrics');
  }

  return response.json();
}

export function useMarketplaceAdminMetrics(window: MarketplaceMetricsWindow = '30') {
  return useQuery({
    queryKey: ['platform', 'marketplace', 'metrics', window],
    queryFn: () => fetchMarketplaceAdminMetrics(window),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
