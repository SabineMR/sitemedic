'use client';

import { useQuery } from '@tanstack/react-query';

export type MarketplaceEntityType =
  | 'events'
  | 'quotes'
  | 'awards'
  | 'disputes'
  | 'users'
  | 'integrity';

export interface MarketplaceEntityRecord {
  id: string;
  entity: MarketplaceEntityType;
  status: string;
  createdAt: string | null;
  primaryText: string;
  secondaryText: string | null;
  amount: number | null;
  metadata: Record<string, unknown>;
}

export interface MarketplaceEntitiesResponse {
  entity: MarketplaceEntityType;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  availableStatuses: string[];
  items: MarketplaceEntityRecord[];
}

export interface MarketplaceEntitiesParams {
  entity: MarketplaceEntityType;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const MARKETPLACE_ENTITIES_API_PATH = '/api/platform/marketplace/entities';

function buildEntitiesQueryString(params: MarketplaceEntitiesParams): string {
  const query = new URLSearchParams();
  query.set('entity', params.entity);
  query.set('page', String(params.page || 1));
  query.set('limit', String(params.limit || 20));

  if (params.status && params.status !== 'all') {
    query.set('status', params.status);
  }

  const trimmedSearch = params.search?.trim();
  if (trimmedSearch) {
    query.set('search', trimmedSearch);
  }

  return query.toString();
}

async function fetchMarketplaceEntities(
  params: MarketplaceEntitiesParams
): Promise<MarketplaceEntitiesResponse> {
  const query = buildEntitiesQueryString(params);
  const response = await fetch(`${MARKETPLACE_ENTITIES_API_PATH}?${query}`);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Failed to fetch marketplace entities');
  }

  return response.json();
}

export function useMarketplaceEntities(params: MarketplaceEntitiesParams) {
  return useQuery({
    queryKey: [
      'platform',
      'marketplace',
      'entities',
      params.entity,
      params.status || 'all',
      params.search || '',
      params.page || 1,
      params.limit || 20,
    ],
    queryFn: () => fetchMarketplaceEntities(params),
    staleTime: 10_000,
    placeholderData: (previousData) => previousData,
  });
}
