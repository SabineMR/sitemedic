/**
 * RIDDOR Queries
 * Phase 6: RIDDOR Auto-Flagging - Plan 04
 */

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface RIDDORIncident {
  id: string;
  treatment_id: string;
  worker_id: string;
  org_id: string;
  category: string;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  auto_flagged: boolean;
  medic_confirmed: boolean | null;
  override_reason: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  deadline_date: string;
  status: 'draft' | 'submitted' | 'confirmed';
  f2508_pdf_path: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
  treatments: {
    id: string;
    injury_type: string;
    body_part: string;
    severity: string;
    mechanism_of_injury: string;
    treatment_types: string[];
    outcome: string;
    reference_number: string;
    created_at: string;
    photo_uris: string[] | null;
  };
  workers: {
    id: string;
    first_name: string;
    last_name: string;
    company: string;
    role: string;
  };
  organizations?: {
    company_name: string;
    site_address: string;
    postcode: string;
    phone: string;
  };
}

/**
 * Fetch all RIDDOR incidents for an organization
 */
export async function fetchRIDDORIncidents(
  orgId: string,
  status?: 'draft' | 'submitted' | 'confirmed'
): Promise<RIDDORIncident[]> {
  let query = supabase
    .from('riddor_incidents')
    .select(`
      *,
      treatments (*),
      workers (*)
    `)
    .eq('org_id', orgId)
    .order('deadline_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as RIDDORIncident[];
}

/**
 * Fetch single RIDDOR incident with full details
 */
export async function fetchRIDDORIncident(
  incidentId: string
): Promise<RIDDORIncident | null> {
  const { data, error } = await supabase
    .from('riddor_incidents')
    .select(`
      *,
      treatments (*),
      workers (*),
      organizations (*)
    `)
    .eq('id', incidentId)
    .single();

  if (error) throw error;
  return data as RIDDORIncident;
}

/**
 * Generate F2508 PDF for a RIDDOR incident
 */
export async function generateF2508PDF(incidentId: string): Promise<{
  success: boolean;
  pdf_path: string;
  signed_url: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/riddor-f2508-generator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ riddor_incident_id: incidentId }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate F2508 PDF');
  }

  return response.json();
}

/**
 * RIDDOR Status History Entry
 * Represents a single status transition in the audit trail
 */
export interface StatusHistoryEntry {
  id: string;
  incident_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: string | null;
  actor_name: string | null;
}

/**
 * Fetch status history for a RIDDOR incident (audit trail)
 */
export async function fetchRIDDORStatusHistory(
  incidentId: string
): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from('riddor_status_history')
    .select('*')
    .eq('incident_id', incidentId)
    .order('changed_at', { ascending: true });

  if (error) throw error;
  return (data || []) as StatusHistoryEntry[];
}

/**
 * Update a RIDDOR draft incident (category and/or override reason)
 * Only valid for incidents in 'draft' status
 */
export async function updateRIDDORDraft(
  incidentId: string,
  updates: { category?: string; override_reason?: string }
): Promise<void> {
  const { error } = await supabase
    .from('riddor_incidents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', incidentId)
    .eq('status', 'draft');

  if (error) throw error;
}

/**
 * Calculate days until RIDDOR deadline
 */
export function calculateDaysUntilDeadline(deadlineDate: string): number {
  const deadline = new Date(deadlineDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffMs = deadline.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
