'use client';

/**
 * ClientPortalView Component
 * Phase 34.1: Self-Procured Jobs -- Plan 05
 *
 * Read-only view of a direct job suitable for client viewing.
 * Displays: job overview, schedule, staffing COUNTS (not medic details),
 * location, payment summary, equipment, and compliance reports.
 *
 * No individual medic names, IDs, or contact info are shown.
 */

import { Info, Calendar, Users, MapPin, CreditCard, Shield, Wrench } from 'lucide-react';
import { STAFFING_ROLE_LABELS, EQUIPMENT_TYPE_LABELS } from '@/lib/marketplace/event-types';
import { EVENT_TYPE_LABELS } from '@/lib/marketplace/event-types';
import { DIRECT_JOB_STATUS_LABELS } from '@/lib/direct-jobs/types';
import type { DirectJobStatus } from '@/lib/direct-jobs/types';
import type { StaffingRole, EquipmentItem } from '@/lib/marketplace/event-types';

// =============================================================================
// Types
// =============================================================================

export interface ClientSafeJob {
  id: string;
  event_name: string;
  status: string;
  event_type: string;
  event_description: string | null;
  special_requirements: string | null;
  indoor_outdoor: string;
  expected_attendance: number | null;
  agreed_price: number;
  deposit_percent: number;
  location_postcode: string;
  location_address: string | null;
  equipment_required: Array<{ type: string; notes?: string }>;
  event_days: Array<{ event_date: string; start_time: string; end_time: string }>;
  staffing_summary: Array<{ role: string; total_quantity: number }>;
  client: {
    client_name: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  } | null;
  payment: {
    deposit_amount: number;
    deposit_paid: boolean;
    remainder_amount: number;
    total_paid: number;
  };
  compliance_reports: Array<{ id: string; report_date: string; pdf_url: string }>;
}

interface ClientPortalViewProps {
  job: ClientSafeJob;
}

// =============================================================================
// Status Badge
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {DIRECT_JOB_STATUS_LABELS[status as DirectJobStatus] || status}
    </span>
  );
}

// =============================================================================
// Section Card
// =============================================================================

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  // timeStr is "HH:MM" or "HH:MM:SS"
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}

function formatCurrency(amount: number): string {
  return `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// =============================================================================
// Main Component
// =============================================================================

export function ClientPortalView({ job }: ClientPortalViewProps) {
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          This is a read-only view of your job details. Contact your service provider for any changes.
        </p>
      </div>

      {/* Job Overview */}
      <div className="rounded-lg border bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{job.event_name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {EVENT_TYPE_LABELS[job.event_type as keyof typeof EVENT_TYPE_LABELS] || job.event_type}
              {job.expected_attendance && ` -- Up to ${job.expected_attendance.toLocaleString()} attendees`}
            </p>
          </div>
          <StatusBadge status={job.status} />
        </div>
        {job.event_description && (
          <p className="mt-3 text-sm text-gray-700">{job.event_description}</p>
        )}
        {job.special_requirements && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Special Requirements</p>
            <p className="text-sm text-gray-700 mt-1">{job.special_requirements}</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Schedule */}
        <SectionCard title="Schedule" icon={Calendar}>
          {job.event_days.length === 0 ? (
            <p className="text-sm text-gray-500">No dates scheduled</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Start</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">End</th>
                  </tr>
                </thead>
                <tbody>
                  {job.event_days.map((day, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 text-gray-900">{formatDate(day.event_date)}</td>
                      <td className="py-2 pr-4 text-gray-700">{formatTime(day.start_time)}</td>
                      <td className="py-2 text-gray-700">{formatTime(day.end_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Staffing Summary -- Role counts ONLY, no individual medic info */}
        <SectionCard title="Staffing Summary" icon={Users}>
          {job.staffing_summary.length === 0 ? (
            <p className="text-sm text-gray-500">No staffing requirements set</p>
          ) : (
            <div className="space-y-2">
              {job.staffing_summary.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {STAFFING_ROLE_LABELS[s.role as StaffingRole] || s.role}
                  </span>
                  <span className="text-sm text-gray-600">
                    {s.total_quantity} {s.total_quantity === 1 ? 'person' : 'people'}
                  </span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">
                Staffing counts only -- individual medic details are not shared.
              </p>
            </div>
          )}
        </SectionCard>

        {/* Location */}
        <SectionCard title="Location" icon={MapPin}>
          <div className="space-y-1">
            {job.location_address && (
              <p className="text-sm text-gray-900">{job.location_address}</p>
            )}
            <p className="text-sm text-gray-700">{job.location_postcode}</p>
            <p className="text-xs text-gray-500 capitalize mt-1">
              Setting: {job.indoor_outdoor}
            </p>
          </div>
        </SectionCard>

        {/* Payment Summary */}
        <SectionCard title="Payment Summary" icon={CreditCard}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Agreed Price</span>
              <span className="font-semibold text-gray-900">{formatCurrency(job.agreed_price)}</span>
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Deposit ({job.deposit_percent}%)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">{formatCurrency(job.payment.deposit_amount)}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      job.payment.deposit_paid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {job.payment.deposit_paid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remainder</span>
                <span className="text-gray-900">{formatCurrency(job.payment.remainder_amount)}</span>
              </div>
            </div>
            <div className="border-t pt-3 flex justify-between text-sm font-semibold">
              <span className="text-gray-700">Total Paid</span>
              <span className="text-gray-900">{formatCurrency(job.payment.total_paid)}</span>
            </div>
          </div>
        </SectionCard>

        {/* Equipment */}
        {job.equipment_required.length > 0 && (
          <SectionCard title="Equipment" icon={Wrench}>
            <div className="space-y-2">
              {job.equipment_required.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="font-medium text-gray-900">
                    {EQUIPMENT_TYPE_LABELS[item.type as EquipmentItem['type']] || item.type}
                  </span>
                  {item.notes && (
                    <span className="text-gray-500">-- {item.notes}</span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Compliance Reports */}
        <SectionCard title="Compliance Reports" icon={Shield}>
          {job.compliance_reports.length === 0 ? (
            <p className="text-sm text-gray-500">
              Reports will be available once the job is in progress.
            </p>
          ) : (
            <div className="space-y-2">
              {job.compliance_reports.map((report) => (
                <a
                  key={report.id}
                  href={report.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  <span className="text-blue-600 font-medium">
                    Report -- {formatDate(report.report_date)}
                  </span>
                  <span className="text-gray-400 text-xs">PDF</span>
                </a>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Client Details */}
      {job.client && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Client Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Client Name</p>
              <p className="text-sm text-gray-900 mt-0.5">{job.client.client_name}</p>
            </div>
            {job.client.contact_name && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Contact Person</p>
                <p className="text-sm text-gray-900 mt-0.5">{job.client.contact_name}</p>
              </div>
            )}
            {job.client.contact_email && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
                <p className="text-sm text-gray-900 mt-0.5">{job.client.contact_email}</p>
              </div>
            )}
            {job.client.contact_phone && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Phone</p>
                <p className="text-sm text-gray-900 mt-0.5">{job.client.contact_phone}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
