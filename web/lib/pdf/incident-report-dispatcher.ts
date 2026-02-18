/**
 * Incident Report Dispatcher
 * Phase 18: Routes to the correct PDF generator Edge Function based on vertical.
 *
 * RIDDOR verticals (construction, tv_film, corporate, education, outdoor_adventure)
 *   → riddor-f2508-generator (F2508 form, Phase 6)
 *
 * Event verticals (festivals, fairs_shows, private_events)
 *   → event-incident-report-generator (Phase 20, fully implemented)
 *
 * Motorsport vertical
 *   → motorsport-incident-generator (Phase 19, fully implemented)
 *
 * Sporting events vertical
 *   → fa-incident-generator (Phase 22, fully implemented)
 */

import { createClient } from '@/lib/supabase/client';

const FUNCTION_BY_VERTICAL: Record<string, string> = {
  construction:      'riddor-f2508-generator',
  tv_film:           'riddor-f2508-generator',
  corporate:         'riddor-f2508-generator',
  education:         'riddor-f2508-generator',
  outdoor_adventure: 'riddor-f2508-generator',
  festivals:         'event-incident-report-generator',
  fairs_shows:       'event-incident-report-generator',
  private_events:    'event-incident-report-generator',
  motorsport:        'motorsport-incident-generator',
  sporting_events:   'fa-incident-generator',
};

export interface DispatchResult {
  signedUrl?: string;
  error?: string;
}

/**
 * Generate an incident report PDF for the given incident and vertical.
 *
 * Routes to the correct Edge Function based on the vertical.
 * Event verticals call event-incident-report-generator (Phase 20).
 * Sporting events vertical calls fa-incident-generator (Phase 22).
 *
 * @param incidentId - The incident ID to generate a PDF for
 * @param vertical   - The event vertical (e.g. 'construction', 'festivals')
 * @returns DispatchResult with signedUrl on success, error on failure
 */
export async function generateIncidentReportPDF(
  incidentId: string,
  vertical: string
): Promise<DispatchResult> {
  const functionName = FUNCTION_BY_VERTICAL[vertical];
  if (!functionName) {
    return { error: `No PDF generator configured for vertical: ${vertical}` };
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { incident_id: incidentId, event_vertical: vertical },
  });

  if (error) return { error: error.message };
  return data as DispatchResult;
}
