export interface IntegritySignalRow {
  id: string;
  signal_type: string;
  confidence: number;
  weight: number;
  created_at: string;
  details: Record<string, unknown>;
}

export interface IntegrityScoreRow {
  event_id: string;
  score: number;
  risk_band: 'low' | 'medium' | 'high';
  contributing_signal_count: number;
  top_signal_types: string[];
  latest_signal_at: string | null;
}

export interface IntegrityEventResponse {
  eventId: string;
  score: IntegrityScoreRow | null;
  signals: IntegritySignalRow[];
}

export async function fetchIntegrityEvent(eventId: string): Promise<IntegrityEventResponse> {
  const response = await fetch(`/api/marketplace/integrity/events/${eventId}`, {
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load integrity signals');
  }

  return payload as IntegrityEventResponse;
}
