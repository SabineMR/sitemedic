/**
 * Vertical Compliance Framework
 *
 * Defines per-industry-vertical compliance and reporting requirements.
 * Each vertical maps to:
 *   - Whether HSE RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences
 *     Regulations 2013) applies to the typical patient
 *   - The primary reporting framework (RIDDOR / Purple Guide / Motorsport UK / etc.)
 *   - Post-treatment guidance shown to the medic on the mobile app
 *   - The label used for the incidents list in the admin dashboard
 *
 * RIDDOR applicability note:
 *   RIDDOR applies when a WORKER (employee or contractor) is injured at a workplace.
 *   For verticals where the typical patient is a member of the public (festivals,
 *   motorsport spectators, private guests), RIDDOR does NOT apply to those patients.
 *   It may still apply to staff/crew at the same event — medics should use judgement.
 */

export type ComplianceFramework =
  | 'RIDDOR'
  | 'purple_guide'
  | 'motorsport_uk'
  | 'fa_incident'
  | 'riddor_plus_ofsted'
  | 'event_incident';

export interface VerticalComplianceConfig {
  /** Primary reporting framework governing this vertical */
  primaryFramework: ComplianceFramework;
  /** Display label for the framework (shown in UI) */
  frameworkLabel: string;
  /** Short description of the framework */
  frameworkDescription: string;
  /** Whether HSE RIDDOR applies to the typical patient in this vertical */
  riddorApplies: boolean;
  /**
   * True if the typical patient is a worker/employee.
   * False if the typical patient is a member of the public (attendee, spectator, guest).
   */
  patientIsWorker: boolean;
  /** Label for the reportable incident form (e.g. "HSE F2508", "Event Incident Report") */
  reportFormLabel: string;
  /**
   * Guidance message shown to the medic after completing a treatment.
   * Should remind them of their post-treatment reporting obligation.
   */
  postTreatmentGuidance: string;
  /** Label for the incidents list section in admin dashboard */
  incidentPageLabel: string;
  /** Badge text shown on the incidents page header */
  complianceBadgeLabel: string;
}

const VERTICAL_COMPLIANCE: Record<string, VerticalComplianceConfig> = {
  construction: {
    primaryFramework: 'RIDDOR',
    frameworkLabel: 'RIDDOR (HSE)',
    frameworkDescription: 'Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013',
    riddorApplies: true,
    patientIsWorker: true,
    reportFormLabel: 'HSE F2508 RIDDOR Report',
    postTreatmentGuidance:
      'This treatment has been logged. If this is a RIDDOR-reportable injury (fracture, amputation, loss of sight, or worker off work >7 days), it will be automatically flagged for HSE reporting via your admin dashboard.',
    incidentPageLabel: 'RIDDOR Incidents',
    complianceBadgeLabel: 'RIDDOR (HSE)',
  },

  tv_film: {
    primaryFramework: 'RIDDOR',
    frameworkLabel: 'RIDDOR (HSE)',
    frameworkDescription: 'Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013',
    riddorApplies: true,
    patientIsWorker: true,
    reportFormLabel: 'HSE F2508 RIDDOR Report',
    postTreatmentGuidance:
      'This treatment has been logged. TV/Film crew are workers under RIDDOR. If this is a reportable injury (fracture, amputation, or >7 days off work), it will be flagged for HSE reporting in your admin dashboard.',
    incidentPageLabel: 'RIDDOR Incidents',
    complianceBadgeLabel: 'RIDDOR (HSE)',
  },

  corporate: {
    primaryFramework: 'RIDDOR',
    frameworkLabel: 'RIDDOR (HSE)',
    frameworkDescription: 'Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013',
    riddorApplies: true,
    patientIsWorker: true,
    reportFormLabel: 'HSE F2508 RIDDOR Report',
    postTreatmentGuidance:
      'This treatment has been logged. Workplace injuries to employees and contractors are reportable under RIDDOR. Eligible incidents will be flagged automatically in your admin dashboard.',
    incidentPageLabel: 'RIDDOR Incidents',
    complianceBadgeLabel: 'RIDDOR (HSE)',
  },

  education: {
    primaryFramework: 'riddor_plus_ofsted',
    frameworkLabel: 'RIDDOR + Ofsted',
    frameworkDescription:
      'Staff injuries: RIDDOR (HSE). Pupil/student incidents: Ofsted SEND / safeguarding duty of care obligation.',
    riddorApplies: true,
    patientIsWorker: false, // Patients may be students OR staff — context-dependent
    reportFormLabel: 'RIDDOR Report / School Incident Record',
    postTreatmentGuidance:
      'This treatment has been logged. For STAFF injuries: RIDDOR applies — reportable incidents will be flagged in your admin dashboard. For STUDENT / PUPIL incidents: ensure the school incident register is updated and notify safeguarding lead if required.',
    incidentPageLabel: 'Incidents & RIDDOR',
    complianceBadgeLabel: 'RIDDOR + Ofsted',
  },

  outdoor_adventure: {
    primaryFramework: 'RIDDOR',
    frameworkLabel: 'RIDDOR (HSE)',
    frameworkDescription:
      'RIDDOR applies to employees and instructors. Participant injuries may also trigger Adventure Activities Licensing Authority (AALA) reporting.',
    riddorApplies: true,
    patientIsWorker: false, // Participants are not workers, but instructors are
    reportFormLabel: 'HSE F2508 RIDDOR Report',
    postTreatmentGuidance:
      'This treatment has been logged. For STAFF/INSTRUCTOR injuries: RIDDOR-reportable incidents will be flagged automatically. For PARTICIPANT injuries: check if your activity falls under Adventure Activities Licensing Authority (AALA) reporting requirements.',
    incidentPageLabel: 'Incidents & RIDDOR',
    complianceBadgeLabel: 'RIDDOR (HSE)',
  },

  festivals: {
    primaryFramework: 'purple_guide',
    frameworkLabel: 'Purple Guide',
    frameworkDescription:
      'The Purple Guide to Health, Safety and Welfare at Music and Other Events (Events Industry Forum)',
    riddorApplies: false, // Attendees are not workers; staff injuries may still require RIDDOR
    patientIsWorker: false,
    reportFormLabel: 'Event Incident Report',
    postTreatmentGuidance:
      'This treatment has been logged. Under Purple Guide guidelines, all patient contacts should be recorded in the Event Incident Log. For STAFF/CREW injuries, RIDDOR may still apply — check with your site manager.',
    incidentPageLabel: 'Event Incidents',
    complianceBadgeLabel: 'Purple Guide',
  },

  motorsport: {
    primaryFramework: 'motorsport_uk',
    frameworkLabel: 'Motorsport UK / FIA',
    frameworkDescription:
      'Motorsport UK General Regulations and FIA Medical Code — incident reports must be submitted to the Clerk of the Course and Chief Medical Officer.',
    riddorApplies: false,
    patientIsWorker: false,
    reportFormLabel: 'Motorsport UK Incident Report',
    postTreatmentGuidance:
      'This treatment has been logged. Complete the Motorsport UK medical incident form and notify the Clerk of the Course. For events with FIA Grade requirements, ensure the CMO receives a copy. Any hospital transport must be reported to the Event Steward immediately.',
    incidentPageLabel: 'Race Incidents',
    complianceBadgeLabel: 'Motorsport UK / FIA',
  },

  sporting_events: {
    primaryFramework: 'fa_incident',
    frameworkLabel: 'FA / NGB Incident Report',
    frameworkDescription:
      'Football Association Injury Report (or governing body equivalent). Serious injuries must be reported to the National Governing Body.',
    riddorApplies: false,
    patientIsWorker: false,
    reportFormLabel: 'FA / NGB Incident Report',
    postTreatmentGuidance:
      'This treatment has been logged. For serious player injuries, complete and submit the FA/NGB Incident Report form. For spectator injuries requiring hospital attendance, ensure the duty manager is notified. For STAFF injuries, RIDDOR may apply.',
    incidentPageLabel: 'Match Incidents',
    complianceBadgeLabel: 'FA / NGB',
  },

  fairs_shows: {
    primaryFramework: 'event_incident',
    frameworkLabel: 'Event Incident Report',
    frameworkDescription:
      'HSE guidance for fairgrounds and amusement parks (HSG175) applies to ride-related incidents. General event incidents follow Purple Guide principles.',
    riddorApplies: false,
    patientIsWorker: false,
    reportFormLabel: 'Event Incident Report',
    postTreatmentGuidance:
      'This treatment has been logged. Ensure the incident is recorded in the event incident log. For ride-related injuries, refer to HSE HSG175 reporting obligations. RIDDOR applies to STAFF/WORKER injuries — check with your site manager.',
    incidentPageLabel: 'Event Incidents',
    complianceBadgeLabel: 'Event Incident',
  },

  private_events: {
    primaryFramework: 'event_incident',
    frameworkLabel: 'Event Incident Report',
    frameworkDescription: 'Internal incident reporting for private events. No mandatory statutory reporting for guest injuries.',
    riddorApplies: false,
    patientIsWorker: false,
    reportFormLabel: 'Event Incident Report',
    postTreatmentGuidance:
      'This treatment has been logged. Ensure the client and event manager are informed of any serious patient contacts. For STAFF injuries, RIDDOR may apply — check with your site manager.',
    incidentPageLabel: 'Event Incidents',
    complianceBadgeLabel: 'Event Incident',
  },

  general: {
    primaryFramework: 'RIDDOR',
    frameworkLabel: 'RIDDOR (HSE)',
    frameworkDescription: 'Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013',
    riddorApplies: true,
    patientIsWorker: true,
    reportFormLabel: 'HSE F2508 RIDDOR Report',
    postTreatmentGuidance:
      'This treatment has been logged. RIDDOR-reportable incidents will be automatically flagged in your admin dashboard.',
    incidentPageLabel: 'RIDDOR Incidents',
    complianceBadgeLabel: 'RIDDOR (HSE)',
  },
};

/**
 * Get the compliance configuration for a given industry vertical.
 * Falls back to 'general' (RIDDOR) if the vertical is unknown.
 */
export function getVerticalCompliance(verticalId: string): VerticalComplianceConfig {
  return VERTICAL_COMPLIANCE[verticalId] ?? VERTICAL_COMPLIANCE.general;
}

/**
 * Whether RIDDOR reporting is the primary framework for this vertical.
 */
export function isRIDDORVertical(verticalId: string): boolean {
  return getVerticalCompliance(verticalId).riddorApplies;
}

/**
 * Get the post-treatment guidance message for display to the medic
 * after completing a treatment on the mobile app.
 */
export function getPostTreatmentGuidance(verticalId: string): string {
  return getVerticalCompliance(verticalId).postTreatmentGuidance;
}
