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
import { TimesheetWithDetails } from '@/lib/queries/admin/timesheets';

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
 * Certification Status: Uses worker.certification_status if provided, otherwise blank
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
    'Certification Status': (w as any).certification_status ?? '',
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
 * Export timesheets to CSV file
 *
 * Columns: Date, Medic, Client, Site, Scheduled Hours, Logged Hours,
 *          Payout Amount, Status, Paid At
 *
 * Date format: UK format (dd/MM/yyyy)
 */
export function exportTimesheetsCSV(timesheets: TimesheetWithDetails[]) {
  // Map timesheets to flat CSV rows
  const csvData = timesheets.map((t) => ({
    'Date': t.booking?.shift_date ? format(new Date(t.booking.shift_date), 'dd/MM/yyyy') : '',
    'Medic': t.medic ? `${t.medic.first_name} ${t.medic.last_name}` : 'Unknown',
    'Client': t.booking?.client?.company_name || '',
    'Site': t.booking?.site_name || '',
    'Scheduled Hours': t.scheduled_hours ?? '',
    'Logged Hours': t.logged_hours ?? '',
    'Payout Amount': t.payout_amount != null ? `£${t.payout_amount.toFixed(2)}` : '',
    'Status': t.payout_status || '',
    'Paid At': t.paid_at ? format(new Date(t.paid_at), 'dd/MM/yyyy') : '',
  }));

  // Generate CSV with react-papaparse (handles escaping, delimiters, special chars)
  const csv = jsonToCSV(csvData);

  // Create Blob with BOM prefix (\uFEFF) for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `timesheets-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export bookings to CSV file
 *
 * Columns: Date, Client, Site, Address, Start, End, Medic,
 *          Total, Platform Fee, Medic Payout, Status
 *
 * Date format: UK format (dd/MM/yyyy)
 */
export function exportBookingsCSV(bookings: any[]) {
  // Map bookings to flat CSV rows
  const csvData = bookings.map((b) => ({
    'Date': b.shift_date ? format(new Date(b.shift_date), 'dd/MM/yyyy') : '',
    'Client': b.clients?.company_name || '',
    'Site': b.site_name || '',
    'Address': b.site_address || '',
    'Start': b.shift_start_time ? b.shift_start_time.slice(0, 5) : '',
    'End': b.shift_end_time ? b.shift_end_time.slice(0, 5) : '',
    'Medic': b.medics ? `${b.medics.first_name} ${b.medics.last_name}` : 'Unassigned',
    'Total': b.total != null ? `£${Number(b.total).toFixed(2)}` : '',
    'Platform Fee': b.platform_fee != null ? `£${Number(b.platform_fee).toFixed(2)}` : '',
    'Medic Payout': b.medic_payout != null ? `£${Number(b.medic_payout).toFixed(2)}` : '',
    'Status': b.status || '',
  }));

  // Generate CSV with react-papaparse
  const csv = jsonToCSV(csvData);

  // Create Blob with BOM prefix for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookings-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export invoice history (completed bookings) to CSV file
 *
 * Columns: Date, Client, Site Postcode, Total, Platform Fee, Medic Payout, Status
 *
 * Date format: UK format (dd/MM/yyyy)
 */
export function exportInvoicesCSV(bookings: any[]) {
  // Map completed bookings to flat CSV rows
  const csvData = bookings.map((b) => ({
    'Date': b.shift_date ? format(new Date(b.shift_date), 'dd/MM/yyyy') : '',
    'Client': b.clients?.company_name || '',
    'Site Postcode': b.site_postcode || '',
    'Total': b.total != null ? `£${Number(b.total).toFixed(2)}` : '',
    'Platform Fee': b.platform_fee != null ? `£${Number(b.platform_fee).toFixed(2)}` : '',
    'Medic Payout': b.medic_payout != null ? `£${Number(b.medic_payout).toFixed(2)}` : '',
    'Status': b.status || '',
  }));

  // Generate CSV with react-papaparse
  const csv = jsonToCSV(csvData);

  // Create Blob with BOM prefix for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
