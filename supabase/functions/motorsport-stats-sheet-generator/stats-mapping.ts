/**
 * Stats Mapping for Motorsport Medical Statistics Sheet
 * Phase 19: Motorsport Vertical — Plan 04
 *
 * Purpose: Aggregate all motorsport treatments for a booking into MotorsportStatsData.
 * Called by index.ts after fetching booking + treatments from Supabase.
 */

import type { MotorsportStatsData } from './types.ts';

// ── Internal shape of a treatment row returned by the DB query ────────────────

interface TreatmentRow {
  id: string;
  injury_type: string | null;
  severity: string | null;
  outcome: string | null;
  created_at: string;
  vertical_extra_fields: Record<string, unknown> | string | null;
}

interface BookingRow {
  id: string;
  site_name: string;
  site_address: string;
  shift_date: string;
  shift_end_date?: string | null;
  org_settings?: { company_name: string } | null;
}

// ── Helper: parse vertical_extra_fields safely ───────────────────────────────

function parseExtraFields(raw: Record<string, unknown> | string | null): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

// ── Helper: format ISO timestamp to HH:MM ────────────────────────────────────

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
}

// ── mapBookingToStats ─────────────────────────────────────────────────────────

/**
 * Aggregate all treatments for a motorsport booking into MotorsportStatsData.
 *
 * @param booking   Booking row with org_settings join
 * @param treatments Array of treatment rows (already filtered to event_vertical = 'motorsport')
 * @param medicName  CMO name derived from first treatment's worker (or 'Unknown')
 */
export function mapBookingToStats(
  booking: BookingRow,
  treatments: TreatmentRow[],
  medicName: string
): MotorsportStatsData {
  const total_patients = treatments.length;

  // Parse extra fields for each treatment once
  const parsedFields = treatments.map((t) => parseExtraFields(t.vertical_extra_fields));

  // ── Severity distribution ────────────────────────────────────────────────
  const severity_counts = treatments.reduce<Record<string, number>>((acc, t) => {
    const key = t.severity ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // ── Outcome distribution ─────────────────────────────────────────────────
  const outcome_counts = treatments.reduce<Record<string, number>>((acc, t) => {
    const key = t.outcome ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // ── Motorsport-specific aggregates ───────────────────────────────────────
  let total_competitors = 0;
  let concussion_count = 0;
  let extrication_count = 0;
  let hospital_referrals = 0;
  const gcsValues: number[] = [];

  for (let i = 0; i < treatments.length; i++) {
    const ef = parsedFields[i];
    const t = treatments[i];

    // Competitor vs spectator/staff
    if (ef?.competitor_car_number) {
      total_competitors++;
    }

    // Concussion
    if (ef?.concussion_suspected === true) {
      concussion_count++;
    }

    // Extrication
    if (ef?.extrication_required === true) {
      extrication_count++;
    }

    // GCS
    const gcs = ef?.gcs_score;
    if (typeof gcs === 'number' && !isNaN(gcs)) {
      gcsValues.push(gcs);
    }

    // Hospital referrals — outcome-based
    const outcome = t.outcome ?? '';
    if (outcome === 'hospital_referral' || outcome === 'ambulance_called') {
      hospital_referrals++;
    }
  }

  const gcs_min = gcsValues.length > 0 ? Math.min(...gcsValues) : null;
  const gcs_max = gcsValues.length > 0 ? Math.max(...gcsValues) : null;
  const total_spectators_staff = total_patients - total_competitors;

  // ── Incidents table ──────────────────────────────────────────────────────
  const incidents = treatments.map((t, i) => {
    const ef = parsedFields[i];
    const gcs = ef?.gcs_score;
    return {
      time: formatTime(t.created_at),
      competitor_number: (ef?.competitor_car_number as string | undefined) ?? '--',
      circuit_section: (ef?.circuit_section as string | undefined) ?? '--',
      injury_type: t.injury_type ?? 'Unknown',
      severity: t.severity ?? 'unknown',
      gcs: typeof gcs === 'number' && !isNaN(gcs) ? gcs : null,
      outcome: t.outcome ?? 'unknown',
      concussion: ef?.concussion_suspected === true,
    };
  });

  // ── Event details ────────────────────────────────────────────────────────
  const event_date = new Date(booking.shift_date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return {
    event_name: booking.site_name,
    event_date,
    event_end_date: booking.shift_end_date
      ? new Date(booking.shift_end_date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : null,
    venue: booking.site_address,
    org_name: booking.org_settings?.company_name ?? 'Unknown Organisation',
    cmo_name: medicName,
    total_patients,
    total_competitors,
    total_spectators_staff,
    severity_counts,
    outcome_counts,
    concussion_count,
    extrication_count,
    gcs_min,
    gcs_max,
    hospital_referrals,
    incidents,
    generated_at: new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    booking_id: booking.id,
  };
}
