/**
 * RIDDOR API Client
 * Phase 6: RIDDOR Auto-Flagging - Plan 02
 *
 * Provides API methods for RIDDOR incident operations:
 * - Fetching RIDDOR incidents for treatments
 * - Updating medic override decisions
 * - Calculating days until deadline
 *
 * Note: Uses direct Supabase API calls (not WatermelonDB sync queue)
 * because RIDDOR overrides must sync immediately for compliance tracking.
 */

import { supabase } from './supabase';

export interface RIDDORIncident {
  id: string;
  treatment_id: string;
  category: 'specified_injury' | 'over_7_day' | 'occupational_disease' | 'dangerous_occurrence';
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  medic_confirmed: boolean | null;
  override_reason: string | null;
  deadline_date: string;
  status: 'draft' | 'submitted' | 'confirmed';
  overridden_by: string | null;
  overridden_at: string | null;
  detected_at: string;
}

/**
 * Fetch RIDDOR incident for a treatment
 *
 * @param treatmentId - Treatment UUID
 * @returns RIDDOR incident or null if treatment is not RIDDOR-flagged
 */
export async function fetchRIDDORIncident(
  treatmentId: string
): Promise<RIDDORIncident | null> {
  const { data, error } = await supabase
    .from('riddor_incidents')
    .select('*')
    .eq('treatment_id', treatmentId)
    .maybeSingle(); // Use maybeSingle() to handle no results gracefully

  if (error) {
    console.error('Error fetching RIDDOR incident:', error);
    throw error;
  }

  return data;
}

/**
 * Update RIDDOR incident with medic override decision
 *
 * @param incidentId - RIDDOR incident UUID
 * @param confirmed - TRUE = medic confirms RIDDOR, FALSE = medic dismisses
 * @param reason - Mandatory explanation for decision
 * @param medicId - Current user's UUID
 */
export async function updateRIDDORIncident(
  incidentId: string,
  confirmed: boolean,
  reason: string,
  medicId: string
): Promise<void> {
  if (!reason.trim()) {
    throw new Error('Override reason is required');
  }

  const { error } = await supabase
    .from('riddor_incidents')
    .update({
      medic_confirmed: confirmed,
      override_reason: reason,
      overridden_by: medicId,
      overridden_at: new Date().toISOString(),
    })
    .eq('id', incidentId);

  if (error) {
    console.error('Error updating RIDDOR incident:', error);
    throw error;
  }
}

/**
 * Calculate days until RIDDOR deadline
 *
 * @param deadlineDate - Deadline date string (YYYY-MM-DD)
 * @returns Number of days until deadline (negative if past deadline)
 */
export function daysUntilDeadline(deadlineDate: string): number {
  const deadline = new Date(deadlineDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day for accurate day count
  deadline.setHours(0, 0, 0, 0);

  const diffMs = deadline.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
