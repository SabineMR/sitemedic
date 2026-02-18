/**
 * Purple Guide Data Mapping
 * Phase 20: Festivals & Events Vertical - Plan 03
 *
 * Maps a raw treatment record (from Supabase) to PurpleGuideData for PDF rendering.
 * Handles null/missing fields gracefully throughout.
 */

import type { PurpleGuideData } from './types.ts';

const TRIAGE_LABELS: Record<string, string> = {
  P1: 'P1 — Immediate (Red)',
  P2: 'P2 — Urgent (Yellow)',
  P3: 'P3 — Delayed (Green)',
  P4: 'P4 — Expectant (Black/Blue)',
};

const DISPOSITION_LABELS: Record<string, string> = {
  discharged_on_site: 'Discharged on site',
  transferred_to_hospital: 'Transferred to hospital',
  refused_treatment: 'Refused treatment',
};

export function mapTreatmentToPurpleGuide(treatment: any): PurpleGuideData {
  // Parse vertical_extra_fields — stored as JSON string on mobile, object on web
  let fields: any = {};
  if (treatment.vertical_extra_fields) {
    fields = typeof treatment.vertical_extra_fields === 'string'
      ? JSON.parse(treatment.vertical_extra_fields)
      : treatment.vertical_extra_fields;
  }

  const triageKey = fields?.triage_priority ?? 'P3';

  return {
    organisationName: treatment.org_settings?.company_name ?? 'Unknown Organisation',
    eventName: treatment.bookings?.site_name ?? treatment.org_settings?.company_name ?? 'Event',
    eventDate: (treatment.bookings?.shift_date ?? treatment.treatment_date)
      ? new Date(treatment.bookings?.shift_date ?? treatment.treatment_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Date not recorded',
    reportGeneratedAt: new Date().toISOString(),
    patientIdentifier: treatment.workers
      ? `${treatment.workers.first_name ?? ''} ${treatment.workers.last_name ?? ''}`.trim() || 'Unnamed attendee'
      : `Ref: ${treatment.reference_number ?? 'N/A'}`,
    timeOfPresentation: treatment.treatment_time ?? 'Not recorded',
    triageCategory: triageKey as PurpleGuideData['triageCategory'],
    triageLabel: TRIAGE_LABELS[triageKey] ?? `${triageKey} — Triage not recorded`,
    presentingComplaint: treatment.presenting_complaint ?? treatment.injury_description ?? '',
    mechanismOfInjury: treatment.mechanism_of_injury ?? '',
    treatmentGiven: treatment.treatment_types
      ? (Array.isArray(treatment.treatment_types) ? treatment.treatment_types : [treatment.treatment_types])
      : ['No treatment types recorded'],
    treatmentNotes: treatment.treatment_notes ?? '',
    alcoholSubstanceInvolvement: fields?.alcohol_substance ?? false,
    safeguardingConcern: fields?.safeguarding_concern ?? false,
    disposition: fields?.disposition ?? 'discharged_on_site',
    dispositionLabel: DISPOSITION_LABELS[fields?.disposition] ?? 'Disposition not recorded',
    medicName: treatment.medics
      ? `${treatment.medics.first_name ?? ''} ${treatment.medics.last_name ?? ''}`.trim() || 'Unknown medic'
      : 'Unknown medic',
    referenceNumber: treatment.reference_number ?? 'N/A',
  };
}
