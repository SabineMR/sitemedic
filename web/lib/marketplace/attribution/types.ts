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

export interface AttributionHandoff {
  id: string;
  event_id: string;
  origin_company_id: string;
  current_from_company_id: string;
  target_company_id: string;
  source_provenance_snapshot: SourceProvenance;
  fee_policy_snapshot: FeePolicy;
  status: Exclude<AttributionLifecycleState, 'solo'>;
  reason: string;
  initiated_by: string;
  accepted_by: string | null;
  accepted_at: string | null;
  declined_by: string | null;
  declined_at: string | null;
  created_at: string;
}

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

export interface AttributionChainResponse {
  eventId: string;
  lifecycleState: AttributionLifecycleState;
  sourceProvenance: SourceProvenance;
  feePolicy: FeePolicy;
  originCompanyId: string | null;
  currentResponsibleCompanyId: string | null;
  activeHandoff: AttributionHandoff | null;
  custodyTimeline: AttributionCustodyEvent[];
}
