import type { SupabaseClient } from '@supabase/supabase-js';

export type IntegritySignalType =
  | 'THREAD_NO_CONVERT'
  | 'PROXIMITY_CLONE'
  | 'MARKETPLACE_TO_DIRECT_SWITCH'
  | 'PASS_ON_ACTIVITY';

interface IntegritySignalInsert {
  event_id: string;
  related_event_id?: string | null;
  related_conversation_id?: string | null;
  company_id?: string | null;
  actor_user_id: string;
  signal_type: IntegritySignalType;
  confidence: number;
  weight: number;
  details?: Record<string, unknown>;
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function riskBandForScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function outwardPostcode(postcode: string | null): string | null {
  if (!postcode) return null;
  const normalized = postcode.trim().toUpperCase();
  const parts = normalized.split(' ');
  return parts[0] || null;
}

function dateDiffDays(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function logIntegritySignal(
  supabase: SupabaseClient,
  signal: IntegritySignalInsert
): Promise<void> {
  const payload = {
    ...signal,
    confidence: clampConfidence(signal.confidence),
    details: signal.details || {},
  };

  const { error } = await supabase.from('marketplace_integrity_signals').insert(payload);
  if (error) {
    throw new Error(`Failed to log integrity signal: ${error.message}`);
  }
}

export async function recomputeIntegrityScoreForEvent(params: {
  supabase: SupabaseClient;
  eventId: string;
  companyId: string | null;
  actorUserId: string;
}) {
  const { supabase, eventId, companyId, actorUserId } = params;

  const { data: signals, error } = await supabase
    .from('marketplace_integrity_signals')
    .select('signal_type, confidence, weight, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to read integrity signals: ${error.message}`);
  }

  const rows = signals || [];
  const weightedScore = Math.round(
    rows.reduce((sum, row) => sum + Number(row.weight || 0) * Number(row.confidence || 0), 0)
  );
  const score = Math.min(1000, weightedScore);
  const topSignalTypes = Array.from(new Set(rows.map((row) => row.signal_type))).slice(0, 5);
  const latestSignalAt = rows[0]?.created_at || null;

  const { error: upsertError } = await supabase.from('marketplace_integrity_scores').upsert(
    {
      event_id: eventId,
      company_id: companyId,
      score,
      risk_band: riskBandForScore(score),
      contributing_signal_count: rows.length,
      top_signal_types: topSignalTypes,
      latest_signal_at: latestSignalAt,
      computed_at: new Date().toISOString(),
      updated_by: actorUserId,
    },
    { onConflict: 'event_id' }
  );

  if (upsertError) {
    throw new Error(`Failed to upsert integrity score: ${upsertError.message}`);
  }
}

export async function ingestMarketplaceToDirectSignals(params: {
  supabase: SupabaseClient;
  directEventId: string;
  actorUserId: string;
  companyId: string;
  eventType: string;
  locationPostcode: string | null;
  firstEventDate: string | null;
}) {
  const {
    supabase,
    directEventId,
    actorUserId,
    companyId,
    eventType,
    locationPostcode,
    firstEventDate,
  } = params;

  const { data: recentConversations, error: conversationsError } = await supabase
    .from('marketplace_conversations')
    .select('id, event_id, last_message_at, created_at')
    .eq('company_id', companyId)
    .gte('last_message_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
    .order('last_message_at', { ascending: false })
    .limit(30);

  if (conversationsError) {
    throw new Error(`Failed to fetch recent conversations: ${conversationsError.message}`);
  }

  const directPostcodeOutward = outwardPostcode(locationPostcode);

  for (const convo of recentConversations || []) {
    const [{ count: messageCount }, { data: relatedEvent }, { data: companyQuote }] = await Promise.all([
      supabase
        .from('marketplace_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', convo.id),
      supabase
        .from('marketplace_events')
        .select('id, event_type, location_postcode, status')
        .eq('id', convo.event_id)
        .maybeSingle(),
      supabase
        .from('marketplace_quotes')
        .select('status')
        .eq('event_id', convo.event_id)
        .eq('company_id', companyId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const safeMessageCount = Number(messageCount || 0);
    const quoteStatus = companyQuote?.status || null;
    const onPlatformConverted = quoteStatus === 'awarded' || relatedEvent?.status === 'awarded';
    const hasThreadNoConvert = safeMessageCount >= 2 && !onPlatformConverted;

    const { data: relatedEventDays } = await supabase
      .from('event_days')
      .select('event_date')
      .eq('event_id', convo.event_id)
      .order('event_date', { ascending: true })
      .limit(1);

    const relatedFirstDate = relatedEventDays?.[0]?.event_date || null;
    const postcodeMatches =
      !!relatedEvent?.location_postcode &&
      (relatedEvent.location_postcode === locationPostcode ||
        outwardPostcode(relatedEvent.location_postcode) === directPostcodeOutward);
    const dateMatches = !!firstEventDate && !!relatedFirstDate && dateDiffDays(firstEventDate, relatedFirstDate) <= 14;
    const typeMatches = !!relatedEvent?.event_type && relatedEvent.event_type === eventType;

    if (hasThreadNoConvert) {
      await logIntegritySignal(supabase, {
        event_id: directEventId,
        related_event_id: convo.event_id,
        related_conversation_id: convo.id,
        company_id: companyId,
        actor_user_id: actorUserId,
        signal_type: 'THREAD_NO_CONVERT',
        confidence: Math.min(1, 0.45 + safeMessageCount * 0.08),
        weight: 24,
        details: {
          messageCount: safeMessageCount,
          quoteStatus,
          conversationLastMessageAt: convo.last_message_at,
        },
      });

      await logIntegritySignal(supabase, {
        event_id: directEventId,
        related_event_id: convo.event_id,
        related_conversation_id: convo.id,
        company_id: companyId,
        actor_user_id: actorUserId,
        signal_type: 'MARKETPLACE_TO_DIRECT_SWITCH',
        confidence: 0.68,
        weight: 28,
        details: {
          reason: 'Direct event created after active marketplace thread with no on-platform conversion',
        },
      });
    }

    if (postcodeMatches && dateMatches && typeMatches) {
      await logIntegritySignal(supabase, {
        event_id: directEventId,
        related_event_id: convo.event_id,
        related_conversation_id: convo.id,
        company_id: companyId,
        actor_user_id: actorUserId,
        signal_type: 'PROXIMITY_CLONE',
        confidence: 0.82,
        weight: 36,
        details: {
          directEventType: eventType,
          marketplaceEventType: relatedEvent?.event_type,
          directPostcode: locationPostcode,
          marketplacePostcode: relatedEvent?.location_postcode,
          directFirstDate: firstEventDate,
          marketplaceFirstDate: relatedFirstDate,
        },
      });
    }
  }

  await recomputeIntegrityScoreForEvent({
    supabase,
    eventId: directEventId,
    companyId,
    actorUserId,
  });
}
