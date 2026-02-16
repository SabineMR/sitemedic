/**
 * RIDDOR Analytics Queries
 * Phase 6: RIDDOR Auto-Flagging - Plan 06
 */

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface OverrideStats {
  totalAutoFlags: number;
  confirmed: number;
  dismissed: number;
  pending: number;
  overrideRate: number; // dismissed / (confirmed + dismissed) * 100
  highConfidenceStats: ConfidenceLevelStats;
  mediumConfidenceStats: ConfidenceLevelStats;
  lowConfidenceStats: ConfidenceLevelStats;
}

export interface ConfidenceLevelStats {
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  totalFlags: number;
  confirmed: number;
  dismissed: number;
  pending: number;
  overrideRate: number; // dismissed / (confirmed + dismissed) * 100
}

export interface OverrideReason {
  reason: string;
  count: number;
  percentage: number;
}

/**
 * Fetch overall override statistics for organization
 */
export async function fetchOverrideStats(orgId: string): Promise<OverrideStats> {
  const { data: incidents, error } = await supabase
    .from('riddor_incidents')
    .select('confidence_level, medic_confirmed')
    .eq('org_id', orgId)
    .eq('auto_flagged', true);

  if (error) throw error;

  const totalAutoFlags = incidents?.length || 0;
  const confirmed = incidents?.filter((i) => i.medic_confirmed === true).length || 0;
  const dismissed = incidents?.filter((i) => i.medic_confirmed === false).length || 0;
  const pending = incidents?.filter((i) => i.medic_confirmed === null).length || 0;

  const overrideRate =
    confirmed + dismissed > 0 ? (dismissed / (confirmed + dismissed)) * 100 : 0;

  // Calculate stats by confidence level
  const getConfidenceStats = (level: 'HIGH' | 'MEDIUM' | 'LOW'): ConfidenceLevelStats => {
    const levelIncidents = incidents?.filter((i) => i.confidence_level === level) || [];
    const levelConfirmed = levelIncidents.filter((i) => i.medic_confirmed === true).length;
    const levelDismissed = levelIncidents.filter((i) => i.medic_confirmed === false).length;
    const levelPending = levelIncidents.filter((i) => i.medic_confirmed === null).length;
    const reviewed = levelConfirmed + levelDismissed;

    return {
      confidenceLevel: level,
      totalFlags: levelIncidents.length,
      confirmed: levelConfirmed,
      dismissed: levelDismissed,
      pending: levelPending,
      overrideRate: reviewed > 0 ? (levelDismissed / reviewed) * 100 : 0,
    };
  };

  return {
    totalAutoFlags,
    confirmed,
    dismissed,
    pending,
    overrideRate,
    highConfidenceStats: getConfidenceStats('HIGH'),
    mediumConfidenceStats: getConfidenceStats('MEDIUM'),
    lowConfidenceStats: getConfidenceStats('LOW'),
  };
}

/**
 * Fetch most common override reasons for dismissed flags
 */
export async function fetchOverrideReasons(orgId: string, limit = 10): Promise<OverrideReason[]> {
  const { data: incidents, error } = await supabase
    .from('riddor_incidents')
    .select('override_reason')
    .eq('org_id', orgId)
    .eq('medic_confirmed', false) // Only dismissed flags
    .not('override_reason', 'is', null);

  if (error) throw error;

  if (!incidents || incidents.length === 0) return [];

  // Count occurrences of each reason
  const reasonCounts = new Map<string, number>();
  incidents.forEach((incident) => {
    const reason = incident.override_reason!;
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
  });

  // Convert to array and calculate percentages
  const total = incidents.length;
  const reasons: OverrideReason[] = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return reasons;
}
