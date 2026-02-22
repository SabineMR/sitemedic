export type AttributionLifecycleState =
  | 'solo'
  | 'pass_on_pending'
  | 'pass_on_accepted'
  | 'pass_on_declined';

export type AttributionEventType =
  | 'solo_initialized'
  | 'pass_on_initiated'
  | 'pass_on_accepted'
  | 'pass_on_declined';

export type SourceProvenance = 'self_sourced' | 'marketplace_sourced';
export type FeePolicy = 'subscription' | 'marketplace_commission' | 'co_share_blended';

export interface AttributionCustodyEvent {
  id: string;
  event_id: string;
  handoff_id: string | null;
  lifecycle_state: AttributionLifecycleState;
  event_type: AttributionEventType;
  actor_user_id: string;
  actor_company_id: string | null;
  source_provenance_snapshot: SourceProvenance;
  fee_policy_snapshot: FeePolicy;
  details: Record<string, unknown>;
  created_at: string;
}
