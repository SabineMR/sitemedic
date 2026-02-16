/**
 * Real-Time Conflict Detection
 * Validates shift assignments before they happen
 * Returns detailed conflict information for UI display
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface ConflictCheck {
  booking_id: string;
  medic_id: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  confined_space_required?: boolean;
  trauma_specialist_required?: boolean;
}

interface Conflict {
  type: 'double_booking' | 'qualification_mismatch' | 'overtime_violation' | 'insufficient_rest' | 'travel_time_infeasible' | 'google_calendar_conflict' | 'time_off_conflict';
  severity: 'critical' | 'warning';
  message: string;
  details?: any;
  can_override?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }

  try {
    const checkData: ConflictCheck = await req.json();
    const conflicts: Conflict[] = [];

    // Check 1: Double-booking (overlapping shifts)
    const doubleBooking = await checkDoubleBooking(checkData);
    if (doubleBooking) conflicts.push(doubleBooking);

    // Check 2: Qualification mismatch
    const qualificationIssue = await checkQualifications(checkData);
    if (qualificationIssue) conflicts.push(qualificationIssue);

    // Check 3: UK Working Time Regulations (overtime)
    const overtimeIssue = await checkOvertimeCompliance(checkData);
    if (overtimeIssue) conflicts.push(overtimeIssue);

    // Check 4: Insufficient rest (11-hour minimum)
    const restIssue = await checkRestPeriod(checkData);
    if (restIssue) conflicts.push(restIssue);

    // Check 5: Travel time feasibility (back-to-back shifts)
    const travelIssue = await checkTravelTime(checkData);
    if (travelIssue) conflicts.push(travelIssue);

    // Check 6: Time-off conflict
    const timeOffIssue = await checkTimeOffConflict(checkData);
    if (timeOffIssue) conflicts.push(timeOffIssue);

    // Categorize severity
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    const warnings = conflicts.filter(c => c.severity === 'warning');

    const canAssign = criticalConflicts.length === 0;

    return new Response(JSON.stringify({
      can_assign: canAssign,
      total_conflicts: conflicts.length,
      critical_conflicts: criticalConflicts.length,
      warnings: warnings.length,
      conflicts,
      recommendation: canAssign
        ? (warnings.length > 0 ? 'Can assign with warnings - review before confirming' : 'Safe to assign')
        : `Cannot assign - ${criticalConflicts.length} critical conflict(s)`,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function checkDoubleBooking(check: ConflictCheck): Promise<Conflict | null> {
  const { data: overlapping } = await supabase
    .from('bookings')
    .select('id, site_name, shift_start_time, shift_end_time')
    .eq('medic_id', check.medic_id)
    .eq('shift_date', check.shift_date)
    .in('status', ['confirmed', 'in_progress'])
    .neq('id', check.booking_id);

  if (overlapping && overlapping.length > 0) {
    const existing = overlapping[0];
    return {
      type: 'double_booking',
      severity: 'critical',
      message: `Medic already booked at ${existing.site_name} on ${check.shift_date}`,
      details: {
        existing_shift: `${existing.shift_start_time} - ${existing.shift_end_time}`,
        conflict_booking_id: existing.id,
      },
      can_override: false,
    };
  }

  return null;
}

async function checkQualifications(check: ConflictCheck): Promise<Conflict | null> {
  if (!check.confined_space_required && !check.trauma_specialist_required) {
    return null; // No special requirements
  }

  const { data: medic } = await supabase
    .from('medics')
    .select('has_confined_space_cert, has_trauma_cert, first_name, last_name')
    .eq('id', check.medic_id)
    .single();

  if (!medic) return null;

  const missing = [];
  if (check.confined_space_required && !medic.has_confined_space_cert) {
    missing.push('Confined Space certification');
  }
  if (check.trauma_specialist_required && !medic.has_trauma_cert) {
    missing.push('Trauma Specialist certification');
  }

  if (missing.length > 0) {
    return {
      type: 'qualification_mismatch',
      severity: 'critical',
      message: `${medic.first_name} ${medic.last_name} lacks required: ${missing.join(', ')}`,
      details: { missing_certifications: missing },
      can_override: false,
    };
  }

  return null;
}

async function checkOvertimeCompliance(check: ConflictCheck): Promise<Conflict | null> {
  const shiftStart = new Date(`${check.shift_date}T${check.shift_start_time}`);
  const shiftEnd = new Date(`${check.shift_date}T${check.shift_end_time}`);

  const { data: complianceResult } = await supabase.rpc('check_working_time_compliance', {
    p_medic_id: check.medic_id,
    p_shift_start: shiftStart.toISOString(),
    p_shift_end: shiftEnd.toISOString(),
  });

  if (complianceResult && complianceResult[0] && !complianceResult[0].is_compliant) {
    const violation = complianceResult[0];
    return {
      type: 'overtime_violation',
      severity: 'critical',
      message: violation.violation_details,
      details: {
        violation_type: violation.violation_type,
        current_weekly_hours: violation.current_weekly_hours,
      },
      can_override: false, // UK law - cannot override
    };
  }

  return null;
}

async function checkRestPeriod(check: ConflictCheck): Promise<Conflict | null> {
  const shiftStart = new Date(`${check.shift_date}T${check.shift_start_time}`);

  // Find last shift before this one
  const { data: previousShift } = await supabase
    .from('bookings')
    .select('shift_date, shift_end_time, site_name')
    .eq('medic_id', check.medic_id)
    .in('status', ['confirmed', 'completed'])
    .lt('shift_date', check.shift_date)
    .order('shift_date', { ascending: false })
    .limit(1)
    .single();

  if (previousShift) {
    const previousEnd = new Date(`${previousShift.shift_date}T${previousShift.shift_end_time}`);
    const restHours = (shiftStart.getTime() - previousEnd.getTime()) / (1000 * 60 * 60);

    if (restHours < 11) {
      return {
        type: 'insufficient_rest',
        severity: 'critical',
        message: `Only ${restHours.toFixed(1)} hours rest since last shift at ${previousShift.site_name} (requires 11 hours per UK law)`,
        details: {
          rest_hours: restHours,
          previous_shift_end: previousEnd.toISOString(),
          required_hours: 11,
        },
        can_override: false,
      };
    }
  }

  return null;
}

async function checkTravelTime(check: ConflictCheck): Promise<Conflict | null> {
  // Find any shift on same day (before or after)
  const { data: sameDay } = await supabase
    .from('bookings')
    .select('id, site_postcode, shift_start_time, shift_end_time, site_name')
    .eq('medic_id', check.medic_id)
    .eq('shift_date', check.shift_date)
    .in('status', ['confirmed', 'in_progress'])
    .neq('id', check.booking_id);

  if (!sameDay || sameDay.length === 0) return null;

  // Get current booking's postcode
  const { data: currentBooking } = await supabase
    .from('bookings')
    .select('site_postcode')
    .eq('id', check.booking_id)
    .single();

  for (const shift of sameDay) {
    // Check travel time between sites
    const { data: travelData } = await supabase
      .from('travel_time_cache')
      .select('travel_time_minutes')
      .eq('origin_postcode', shift.site_postcode)
      .eq('destination_postcode', currentBooking.site_postcode)
      .single();

    if (travelData) {
      const travelMinutes = travelData.travel_time_minutes;

      // Check if shifts are back-to-back
      const thisStart = new Date(`${check.shift_date}T${check.shift_start_time}`);
      const otherEnd = new Date(`${check.shift_date}T${shift.shift_end_time}`);
      const gapMinutes = (thisStart.getTime() - otherEnd.getTime()) / (1000 * 60);

      if (gapMinutes > 0 && gapMinutes < travelMinutes) {
        return {
          type: 'travel_time_infeasible',
          severity: 'warning',
          message: `Travel from ${shift.site_name} takes ${travelMinutes} min, but only ${Math.round(gapMinutes)} min gap between shifts`,
          details: {
            travel_time_minutes: travelMinutes,
            gap_minutes: gapMinutes,
            previous_site: shift.site_name,
          },
          can_override: true, // Warning only - medic may choose to rush
        };
      }
    }
  }

  return null;
}

async function checkTimeOffConflict(check: ConflictCheck): Promise<Conflict | null> {
  const { data: timeOff } = await supabase
    .from('medic_availability')
    .select('request_type, reason')
    .eq('medic_id', check.medic_id)
    .eq('date', check.shift_date)
    .eq('is_available', false)
    .eq('status', 'approved')
    .single();

  if (timeOff) {
    return {
      type: 'time_off_conflict',
      severity: 'critical',
      message: `Medic has approved time off on ${check.shift_date} (${timeOff.request_type})`,
      details: {
        reason: timeOff.reason,
        request_type: timeOff.request_type,
      },
      can_override: false,
    };
  }

  return null;
}
