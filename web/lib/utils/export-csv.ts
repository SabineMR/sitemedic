/**
 * CSV Export Utilities
 *
 * Uses react-papaparse for proper CSV generation with escaping, BOM prefix for Excel UTF-8 compatibility.
 *
 * Research: Pitfall 7 from 04-RESEARCH.md - Never build CSV strings manually, use library for special character handling
 */

import { jsonToCSV } from 'react-papaparse';
import { format } from 'date-fns';
import { TreatmentWithWorker, Worker } from '@/types/database.types';

/**
 * Export treatments to CSV file
 *
 * Columns: Date, Worker Name, Company, Injury Type, Body Part, Severity,
 *          Treatment Notes, Outcome, RIDDOR Reportable
 *
 * Date format: UK format (dd/MM/yyyy HH:mm)
 */
export function exportTreatmentsCSV(treatments: TreatmentWithWorker[]) {
  // Map treatments to flat CSV rows
  const csvData = treatments.map((t) => ({
    'Date': t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy HH:mm') : '',
    'Worker Name': t.worker
      ? `${t.worker.first_name} ${t.worker.last_name}`
      : 'Unknown',
    'Company': t.worker?.company || '',
    'Injury Type': t.injury_type || '',
    'Body Part': t.body_part || '',
    'Severity': t.severity || '',
    'Treatment Notes': t.treatment_notes || '',
    'Outcome': formatOutcome(t.outcome),
    'RIDDOR Reportable': t.is_riddor_reportable ? 'Yes' : 'No',
  }));

  // Generate CSV with react-papaparse (handles escaping, delimiters, special chars)
  const csv = jsonToCSV(csvData);

  // Create Blob with BOM prefix (\uFEFF) for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `treatments-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export workers to CSV file
 *
 * Columns: Last Name, First Name, Company, Role, Phone, Emergency Contact Name,
 *          Emergency Contact Phone, Health Notes, Consent Given, Consent Date,
 *          Certification Status, Added Date
 *
 * Certification Status: Hard-coded "Active" for now (Phase 7 will provide real data)
 */
export function exportWorkersCSV(workers: Worker[]) {
  // Map workers to flat CSV rows
  const csvData = workers.map((w) => ({
    'Last Name': w.last_name || '',
    'First Name': w.first_name || '',
    'Company': w.company || '',
    'Role': w.role || '',
    'Phone': w.phone || '',
    'Emergency Contact Name': w.emergency_contact_name || '',
    'Emergency Contact Phone': w.emergency_contact_phone || '',
    'Health Notes': w.health_notes || '',
    'Consent Given': w.consent_given ? 'Yes' : 'No',
    'Consent Date': w.consent_date
      ? format(new Date(w.consent_date), 'dd/MM/yyyy')
      : '',
    'Certification Status': 'Active', // TODO: Phase 7 - Calculate from certifications table
    'Added Date': w.created_at
      ? format(new Date(w.created_at), 'dd/MM/yyyy HH:mm')
      : '',
  }));

  // Generate CSV with react-papaparse
  const csv = jsonToCSV(csvData);

  // Create Blob with BOM prefix for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `worker-registry-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format outcome enum to human-readable string
 */
function formatOutcome(
  outcome:
    | 'returned_to_work'
    | 'sent_home'
    | 'hospital_referral'
    | 'ambulance_called'
    | null
): string {
  if (!outcome) return '';
  const map: Record<string, string> = {
    returned_to_work: 'Returned to Work',
    sent_home: 'Sent Home',
    hospital_referral: 'Hospital Referral',
    ambulance_called: 'Ambulance Called',
  };
  return map[outcome] || outcome;
}
