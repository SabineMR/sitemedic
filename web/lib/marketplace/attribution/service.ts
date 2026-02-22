import type { SupabaseClient } from '@supabase/supabase-js';
import {
  assertPassOnPreservesIntegrity,
  isFeePolicyAllowedForProvenance,
} from './invariants';
import {
  logIntegritySignal,
  recomputeIntegrityScoreForEvent,
} from '@/lib/marketplace/integrity/signals';
import type {
  AttributionChainResponse,
  AttributionCustodyEvent,
  AttributionHandoff,
  FeePolicy,
  SourceProvenance,
} from './types';

interface EventIntegrityRow {
  id: string;
  source_provenance: SourceProvenance;
  fee_policy: FeePolicy;
  source: 'marketplace' | 'direct';
  posted_by: string;
  client_id: string | null;
}

export async function resolveAdminCompanyId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('marketplace_companies')
    .select('id')
    .eq('admin_user_id', userId)
    .maybeSingle();

  return data?.id ?? null;
}

async function resolveOriginCompanyId(
  supabase: SupabaseClient,
  event: EventIntegrityRow
): Promise<string | null> {
  if (event.source === 'direct') {
    if (event.client_id) {
      const { data: clientRow } = await supabase
        .from('direct_clients')
        .select('company_id')
        .eq('id', event.client_id)
        .maybeSingle();

      if (clientRow?.company_id) {
        return clientRow.company_id;
      }
    }

    const { data: postingCompany } = await supabase
      .from('marketplace_companies')
      .select('id')
      .eq('admin_user_id', event.posted_by)
      .maybeSingle();

    return postingCompany?.id ?? null;
  }

  const { data: latestAward } = await supabase
    .from('marketplace_award_history')
    .select('winning_quote_id')
    .eq('event_id', event.id)
    .order('awarded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestAward?.winning_quote_id) {
    return null;
  }

  const { data: winningQuote } = await supabase
    .from('marketplace_quotes')
    .select('company_id')
    .eq('id', latestAward.winning_quote_id)
    .maybeSingle();

  return winningQuote?.company_id ?? null;
}

async function resolveCurrentResponsibleCompanyId(
  supabase: SupabaseClient,
  eventId: string,
  fallbackOriginCompanyId: string | null
): Promise<string | null> {
  const { data: latestAccepted } = await supabase
    .from('marketplace_attribution_handoffs')
    .select('target_company_id')
    .eq('event_id', eventId)
    .eq('status', 'pass_on_accepted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return latestAccepted?.target_company_id ?? fallbackOriginCompanyId;
}

export async function getAttributionChain(
  supabase: SupabaseClient,
  eventId: string
): Promise<AttributionChainResponse> {
  const { data: eventRaw } = await supabase
    .from('marketplace_events')
    .select('id, source_provenance, fee_policy, source, posted_by, client_id')
    .eq('id', eventId)
    .single();

  const event = eventRaw as EventIntegrityRow | null;

  if (!event) {
    throw new Error('Event not found');
  }

  const originCompanyId = await resolveOriginCompanyId(supabase, event);
  const currentResponsibleCompanyId = await resolveCurrentResponsibleCompanyId(
    supabase,
    eventId,
    originCompanyId
  );

  const { data: activeHandoffRow } = await supabase
    .from('marketplace_attribution_handoffs')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'pass_on_pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: custodyRowsRaw } = await supabase
    .from('marketplace_attribution_custody')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  const activeHandoff = (activeHandoffRow || null) as AttributionHandoff | null;
  const custodyRows = (custodyRowsRaw || []) as AttributionCustodyEvent[];

  const lifecycleState = activeHandoff
    ? activeHandoff.status
    : custodyRows && custodyRows.length > 0
      ? custodyRows[custodyRows.length - 1].lifecycle_state
      : 'solo';

  return {
    eventId,
    lifecycleState,
    sourceProvenance: event.source_provenance,
    feePolicy: event.fee_policy,
    originCompanyId,
    currentResponsibleCompanyId,
    activeHandoff: activeHandoff ?? null,
    custodyTimeline: custodyRows ?? [],
  };
}

export async function ensureSoloCustodyInitialized(params: {
  supabase: SupabaseClient;
  eventId: string;
  actorUserId: string;
  actorCompanyId: string | null;
  sourceProvenance: SourceProvenance;
  feePolicy: FeePolicy;
}) {
  const { supabase, eventId, actorUserId, actorCompanyId, sourceProvenance, feePolicy } = params;

  assertPassOnPreservesIntegrity({ sourceProvenance, feePolicy });

  const { data: existing } = await supabase
    .from('marketplace_attribution_custody')
    .select('id')
    .eq('event_id', eventId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return;
  }

  const { error } = await supabase.from('marketplace_attribution_custody').insert({
    event_id: eventId,
    handoff_id: null,
    lifecycle_state: 'solo',
    event_type: 'solo_initialized',
    actor_user_id: actorUserId,
    actor_company_id: actorCompanyId,
    source_provenance_snapshot: sourceProvenance,
    fee_policy_snapshot: feePolicy,
    details: { initializedBy: 'phase_49_operations' },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function initiatePassOn(params: {
  supabase: SupabaseClient;
  eventId: string;
  initiatedByUserId: string;
  targetCompanyId: string;
  reason: string;
}) {
  const { supabase, eventId, initiatedByUserId, targetCompanyId, reason } = params;

  const initiatingCompanyId = await resolveAdminCompanyId(supabase, initiatedByUserId);
  if (!initiatingCompanyId) {
    throw new Error('Only marketplace company admins can initiate pass-on handoffs');
  }

  const { data: eventRaw } = await supabase
    .from('marketplace_events')
    .select('id, source_provenance, fee_policy, source, posted_by, client_id')
    .eq('id', eventId)
    .single();

  const event = eventRaw as EventIntegrityRow | null;

  if (!event) {
    throw new Error('Event not found');
  }

  if (!isFeePolicyAllowedForProvenance(event.source_provenance, event.fee_policy)) {
    throw new Error('Event has invalid provenance/fee policy state');
  }

  const originCompanyId = await resolveOriginCompanyId(supabase, event);
  if (!originCompanyId) {
    throw new Error('Could not resolve origin company for this event');
  }

  const currentResponsibleCompanyId = await resolveCurrentResponsibleCompanyId(
    supabase,
    eventId,
    originCompanyId
  );

  if (!currentResponsibleCompanyId || currentResponsibleCompanyId !== initiatingCompanyId) {
    throw new Error('Only the currently responsible company can initiate pass-on');
  }

  if (targetCompanyId === currentResponsibleCompanyId) {
    throw new Error('Target company must differ from current responsible company');
  }

  await ensureSoloCustodyInitialized({
    supabase,
    eventId,
    actorUserId: initiatedByUserId,
    actorCompanyId: initiatingCompanyId,
    sourceProvenance: event.source_provenance,
    feePolicy: event.fee_policy,
  });

  const { data: handoffRow, error: handoffError } = await supabase
    .from('marketplace_attribution_handoffs')
    .insert({
      event_id: eventId,
      origin_company_id: originCompanyId,
      current_from_company_id: currentResponsibleCompanyId,
      target_company_id: targetCompanyId,
      source_provenance_snapshot: event.source_provenance,
      fee_policy_snapshot: event.fee_policy,
      status: 'pass_on_pending',
      reason,
      initiated_by: initiatedByUserId,
    })
    .select('*')
    .single();

  const handoff = handoffRow as AttributionHandoff | null;

  if (handoffError || !handoff) {
    throw new Error(handoffError?.message || 'Failed to create handoff');
  }

  const { error: custodyError } = await supabase.from('marketplace_attribution_custody').insert({
    event_id: eventId,
    handoff_id: handoff.id,
    lifecycle_state: 'pass_on_pending',
    event_type: 'pass_on_initiated',
    actor_user_id: initiatedByUserId,
    actor_company_id: initiatingCompanyId,
    source_provenance_snapshot: event.source_provenance,
    fee_policy_snapshot: event.fee_policy,
    details: {
      fromCompanyId: currentResponsibleCompanyId,
      targetCompanyId,
      reason,
    },
  });

  if (custodyError) {
    throw new Error(custodyError.message);
  }

  try {
    await logIntegritySignal(supabase, {
      event_id: eventId,
      related_event_id: eventId,
      company_id: initiatingCompanyId,
      actor_user_id: initiatedByUserId,
      signal_type: 'PASS_ON_ACTIVITY',
      confidence: 0.42,
      weight: 12,
      details: {
        handoffId: handoff.id,
        action: 'initiated',
      },
    });

    await recomputeIntegrityScoreForEvent({
      supabase,
      eventId,
      companyId: initiatingCompanyId,
      actorUserId: initiatedByUserId,
    });
  } catch (signalError) {
    console.warn('PASS_ON_ACTIVITY signal ingestion failed (non-fatal):', signalError);
  }

  return handoff;
}

export async function resolvePassOn(params: {
  supabase: SupabaseClient;
  handoffId: string;
  actorUserId: string;
  action: 'accept' | 'decline';
  reason?: string;
}) {
  const { supabase, handoffId, actorUserId, action, reason } = params;

  const actorCompanyId = await resolveAdminCompanyId(supabase, actorUserId);
  if (!actorCompanyId) {
    throw new Error('Only marketplace company admins can resolve pass-on handoffs');
  }

  const { data: handoffRow } = await supabase
    .from('marketplace_attribution_handoffs')
    .select('*')
    .eq('id', handoffId)
    .single();

  const handoff = handoffRow as AttributionHandoff | null;

  if (!handoff) {
    throw new Error('Handoff not found');
  }

  if (handoff.status !== 'pass_on_pending') {
    throw new Error('Handoff is not pending');
  }

  if (handoff.target_company_id !== actorCompanyId) {
    throw new Error('Only the target company can accept or decline this handoff');
  }

  assertPassOnPreservesIntegrity({
    sourceProvenance: handoff.source_provenance_snapshot,
    feePolicy: handoff.fee_policy_snapshot,
  });

  const now = new Date().toISOString();
  const nextStatus = action === 'accept' ? 'pass_on_accepted' : 'pass_on_declined';

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
  };

  if (action === 'accept') {
    updatePayload.accepted_by = actorUserId;
    updatePayload.accepted_at = now;
  } else {
    updatePayload.declined_by = actorUserId;
    updatePayload.declined_at = now;
  }

  const { data: updatedHandoffRow, error: updateError } = await supabase
    .from('marketplace_attribution_handoffs')
    .update(updatePayload)
    .eq('id', handoffId)
    .eq('status', 'pass_on_pending')
    .select('*')
    .single();

  const updatedHandoff = updatedHandoffRow as AttributionHandoff | null;

  if (updateError || !updatedHandoff) {
    throw new Error(updateError?.message || 'Failed to update handoff status');
  }

  const { error: custodyError } = await supabase.from('marketplace_attribution_custody').insert({
    event_id: handoff.event_id,
    handoff_id: handoff.id,
    lifecycle_state: nextStatus,
    event_type: action === 'accept' ? 'pass_on_accepted' : 'pass_on_declined',
    actor_user_id: actorUserId,
    actor_company_id: actorCompanyId,
    source_provenance_snapshot: handoff.source_provenance_snapshot,
    fee_policy_snapshot: handoff.fee_policy_snapshot,
    details: {
      reason: reason || null,
    },
  });

  if (custodyError) {
    throw new Error(custodyError.message);
  }

  try {
    await logIntegritySignal(supabase, {
      event_id: handoff.event_id,
      related_event_id: handoff.event_id,
      company_id: actorCompanyId,
      actor_user_id: actorUserId,
      signal_type: 'PASS_ON_ACTIVITY',
      confidence: action === 'accept' ? 0.5 : 0.35,
      weight: action === 'accept' ? 14 : 8,
      details: {
        handoffId: handoff.id,
        action,
      },
    });

    await recomputeIntegrityScoreForEvent({
      supabase,
      eventId: handoff.event_id,
      companyId: actorCompanyId,
      actorUserId: actorUserId,
    });
  } catch (signalError) {
    console.warn('PASS_ON_ACTIVITY signal ingestion failed (non-fatal):', signalError);
  }

  return updatedHandoff;
}
