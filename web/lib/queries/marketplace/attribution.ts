import type { AttributionChainResponse } from '@/lib/marketplace/attribution/types';

export async function fetchAttributionChain(eventId: string): Promise<AttributionChainResponse> {
  const response = await fetch(`/api/marketplace/attribution/events/${eventId}`, {
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to fetch attribution chain');
  }

  return payload as AttributionChainResponse;
}
