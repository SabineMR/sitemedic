export type CancellationReason =
  | 'client_cancelled'
  | 'company_cancelled'
  | 'staffing_issue'
  | 'weather'
  | 'other';

export interface MarketplaceDispute {
  id: string;
  event_id: string;
  status: 'open' | 'under_review' | 'resolved';
  category: string;
  description?: string | null;
  created_at: string;
}
