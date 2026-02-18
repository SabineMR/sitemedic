/**
 * Event Incident Queries
 * Phase 20: Festivals / Events Vertical - Plan 04
 *
 * Generates the Purple Guide Event Incident Report PDF via the
 * event-incident-report-generator Edge Function.
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Generate Event Incident Report PDF for a festivals treatment
 *
 * Calls the event-incident-report-generator Edge Function and returns
 * a signed URL to the generated PDF in Supabase Storage.
 *
 * @param treatmentId - The treatment UUID to generate the report for
 * @returns Object with success flag, storage path, and signed URL
 */
export async function generateEventIncidentPDF(treatmentId: string): Promise<{
  success: boolean;
  pdf_path: string;
  signed_url: string;
}> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/event-incident-report-generator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ incident_id: treatmentId, event_vertical: 'festivals' }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate Event Incident Report');
  }

  return response.json();
}
