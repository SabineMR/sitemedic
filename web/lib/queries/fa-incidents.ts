/**
 * FA Incident Queries
 * Phase 22: Football Sports Vertical - Plan 05
 *
 * Generates the FA / SGSA Match Day Report PDF via the
 * fa-incident-generator Edge Function.
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Generate FA / SGSA Match Day Report PDF for a sporting_events treatment
 *
 * Calls the fa-incident-generator Edge Function and returns a signed URL
 * to the generated PDF in Supabase Storage.
 *
 * @param treatmentId - The treatment UUID to generate the report for
 * @returns Object with success flag, patient_type, signed URL, and file name
 */
export async function generateFAIncidentPDF(treatmentId: string): Promise<{
  success: boolean;
  patient_type: 'player' | 'spectator';
  signed_url: string;
  file_name: string;
}> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fa-incident-generator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ incident_id: treatmentId, event_vertical: 'sporting_events' }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate FA / SGSA Match Day Report');
  }

  return response.json();
}
