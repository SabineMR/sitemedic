'use client';

/**
 * Direct Job Detail Page
 * Phase 34.1: Self-Procured Jobs -- Plan 04
 *
 * Comprehensive job detail page at /dashboard/jobs/[id] with:
 * - Client details section
 * - Job info and description
 * - Schedule with event days
 * - Staffing requirements
 * - Pricing breakdown (0% commission highlighted)
 * - Medic assignment with availability checking
 * - Payment flow (deposit + remainder)
 * - Status management buttons (confirm, start, complete, cancel)
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Building2,
  User,
  Users,
  Phone,
  Mail,
  CreditCard,
  CheckCircle2,
  XCircle,
  Play,
  Loader2,
  AlertTriangle,
  Banknote,
  Shield,
  Star,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DIRECT_JOB_STATUS_LABELS,
  type DirectJobStatus,
} from '@/lib/direct-jobs/types';
import { EVENT_TYPE_LABELS } from '@/lib/marketplace/event-types';
import { STAFFING_ROLE_LABELS, EQUIPMENT_TYPE_LABELS } from '@/lib/marketplace/event-types';
import type { EventType, StaffingRole, EquipmentItem } from '@/lib/marketplace/event-types';
import { RatingForm, StarDisplay } from '@/components/direct-jobs/RatingForm';

// =============================================================================
// Types
// =============================================================================

interface EventDay {
  id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

interface StaffingRequirement {
  id: string;
  role: StaffingRole;
  quantity: number;
  additional_notes: string | null;
}

interface DirectClient {
  id: string;
  client_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line_1: string | null;
  city: string | null;
  postcode: string | null;
}

interface JobDetail {
  id: string;
  event_name: string;
  event_type: EventType;
  event_description: string | null;
  special_requirements: string | null;
  indoor_outdoor: string;
  expected_attendance: number | null;
  agreed_price: number;
  location_postcode: string;
  location_address: string | null;
  location_display: string | null;
  location_what3words: string | null;
  status: DirectJobStatus;
  created_at: string;
  updated_at: string;
  client: DirectClient | null;
  event_days: EventDay[];
  event_staffing_requirements: StaffingRequirement[];
  equipment_required: EquipmentItem[];
}

interface AssignedMedic {
  id: string;
  first_name: string;
  last_name: string;
}

// Status badge colours
const STATUS_COLORS: Record<DirectJobStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
};

// =============================================================================
// Component
// =============================================================================

export default function DirectJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Medic assignment state
  const [medicIdInput, setMedicIdInput] = useState('');
  const [assignedMedics, setAssignedMedics] = useState<AssignedMedic[]>([]);
  const [medicLoading, setMedicLoading] = useState(false);

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    deposit_amount: number;
    remainder_amount: number;
    mock?: boolean;
  } | null>(null);

  // Ratings state
  const [existingRating, setExistingRating] = useState<{
    rating: number;
    review: string | null;
  } | null>(null);
  const [allRatings, setAllRatings] = useState<
    Array<{ id: string; rater_type: string; rating: number; review: string | null; created_at: string }>
  >([]);

  // ── Fetch job ──────────────────────────────────────────────────────────────

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/direct-jobs/${id}`);
      const data = await res.json();

      if (res.ok && data.job) {
        setJob(data.job);
      } else {
        toast.error(data.error || 'Failed to load job');
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // ── Fetch ratings (only for completed jobs) ────────────────────────────────

  const fetchRatings = useCallback(async () => {
    if (!job || job.status !== 'completed') return;
    try {
      const res = await fetch(`/api/direct-jobs/${id}/ratings`);
      const data = await res.json();
      if (res.ok) {
        setAllRatings(data.ratings || []);
        // Find the current user's rating (company admin)
        const myRating = (data.ratings || []).find(
          (r: { rater_type: string }) => r.rater_type === 'company'
        );
        if (myRating) {
          setExistingRating({ rating: myRating.rating, review: myRating.review });
        }
      }
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
    }
  }, [id, job]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // ── Status Actions ─────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setActionLoading('confirm');
    try {
      const res = await fetch(`/api/direct-jobs/${id}/confirm`, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Job confirmed');
        if (data.bookingCreated) {
          toast.success(`Booking created: ${data.bookingId}`);
        }
        fetchJob();
      } else {
        toast.error(data.error || 'Failed to confirm job');
      }
    } catch {
      toast.error('Failed to confirm job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(newStatus);
    try {
      const res = await fetch(`/api/direct-jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Job status updated to ${DIRECT_JOB_STATUS_LABELS[newStatus as DirectJobStatus] || newStatus}`);
        fetchJob();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Payment ────────────────────────────────────────────────────────────────

  const handleCreatePayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/direct-jobs/${id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_percent: 25 }),
      });
      const data = await res.json();

      if (res.ok) {
        setPaymentResult({
          deposit_amount: data.amounts.deposit_amount,
          remainder_amount: data.amounts.remainder_amount,
          mock: data.mock,
        });
        toast.success(
          data.mock
            ? 'Mock payment intent created (dev mode)'
            : 'Payment intent created'
        );
      } else {
        toast.error(data.error || 'Failed to create payment');
      }
    } catch {
      toast.error('Failed to create payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Medic Assignment ───────────────────────────────────────────────────────

  const handleAssignMedic = async () => {
    if (!medicIdInput.trim()) {
      toast.error('Please enter a medic ID');
      return;
    }

    setMedicLoading(true);
    try {
      const res = await fetch(`/api/direct-jobs/${id}/assign-medic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medic_id: medicIdInput.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message);
        setAssignedMedics((prev) => [
          ...prev,
          { id: medicIdInput.trim(), first_name: data.medic.name.split(' ')[0], last_name: data.medic.name.split(' ').slice(1).join(' ') },
        ]);
        setMedicIdInput('');
      } else if (data.code === 'SCHEDULE_CONFLICT') {
        toast.error(data.message);
      } else {
        toast.error(data.error || 'Failed to assign medic');
      }
    } catch {
      toast.error('Failed to assign medic');
    } finally {
      setMedicLoading(false);
    }
  };

  const handleRemoveMedic = async (medicId: string) => {
    setMedicLoading(true);
    try {
      const res = await fetch(`/api/direct-jobs/${id}/assign-medic`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medic_id: medicId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message);
        setAssignedMedics((prev) => prev.filter((m) => m.id !== medicId));
      } else {
        toast.error(data.error || 'Failed to remove medic');
      }
    } catch {
      toast.error('Failed to remove medic');
    } finally {
      setMedicLoading(false);
    }
  };

  // ── Loading / Not Found ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Loading job details...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-24">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Job Not Found</h2>
        <p className="text-gray-500 mb-6">This direct job could not be found or you do not have access.</p>
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>
      </div>
    );
  }

  const depositAmount = job.agreed_price * 0.25;
  const remainderAmount = job.agreed_price - depositAmount;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
          <h1 className="text-3xl font-bold">{job.event_name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border ${
                STATUS_COLORS[job.status]
              }`}
            >
              {DIRECT_JOB_STATUS_LABELS[job.status]}
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
              {EVENT_TYPE_LABELS[job.event_type] || job.event_type}
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              <Shield className="h-3 w-3 mr-1" />
              0% Commission
            </span>
            <Link
              href={`/dashboard/jobs/${id}/client-portal`}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Client Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Status Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {job.status === 'draft' && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={actionLoading === 'confirm'}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading === 'confirm' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirm Job
          </button>
        )}
        {job.status === 'confirmed' && (
          <button
            type="button"
            onClick={() => handleStatusChange('in_progress')}
            disabled={actionLoading === 'in_progress'}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {actionLoading === 'in_progress' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Start Job
          </button>
        )}
        {job.status === 'in_progress' && (
          <button
            type="button"
            onClick={() => handleStatusChange('completed')}
            disabled={actionLoading === 'completed'}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === 'completed' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Complete Job
          </button>
        )}
        {(job.status === 'draft' || job.status === 'confirmed') && (
          <button
            type="button"
            onClick={() => handleStatusChange('cancelled')}
            disabled={actionLoading === 'cancelled'}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {actionLoading === 'cancelled' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel Job
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Details */}
          {job.client && (
            <section className="border rounded-lg p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-500" />
                Client Details
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">Client Name</dt>
                  <dd className="mt-0.5">{job.client.client_name}</dd>
                </div>
                {job.client.contact_name && (
                  <div>
                    <dt className="font-medium text-gray-500">Contact Person</dt>
                    <dd className="mt-0.5 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      {job.client.contact_name}
                    </dd>
                  </div>
                )}
                {job.client.contact_email && (
                  <div>
                    <dt className="font-medium text-gray-500">Email</dt>
                    <dd className="mt-0.5 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <a href={`mailto:${job.client.contact_email}`} className="text-blue-600 hover:underline">
                        {job.client.contact_email}
                      </a>
                    </dd>
                  </div>
                )}
                {job.client.contact_phone && (
                  <div>
                    <dt className="font-medium text-gray-500">Phone</dt>
                    <dd className="mt-0.5 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <a href={`tel:${job.client.contact_phone}`} className="text-blue-600 hover:underline">
                        {job.client.contact_phone}
                      </a>
                    </dd>
                  </div>
                )}
                {(job.client.address_line_1 || job.client.city || job.client.postcode) && (
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-500">Address</dt>
                    <dd className="mt-0.5">
                      {[job.client.address_line_1, job.client.city, job.client.postcode]
                        .filter(Boolean)
                        .join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Job Info */}
          <section className="border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4">Job Information</h2>
            {job.event_description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-sm whitespace-pre-wrap">{job.event_description}</p>
              </div>
            )}
            {job.special_requirements && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Special Requirements</h3>
                <p className="text-sm whitespace-pre-wrap">{job.special_requirements}</p>
              </div>
            )}
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Setting</dt>
                <dd className="mt-0.5 capitalize">{job.indoor_outdoor}</dd>
              </div>
              {job.expected_attendance && (
                <div>
                  <dt className="font-medium text-gray-500">Expected Attendance</dt>
                  <dd className="mt-0.5">{job.expected_attendance.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Schedule */}
          <section className="border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              Schedule
            </h2>
            {job.event_days.length === 0 ? (
              <p className="text-sm text-gray-500">No days scheduled yet.</p>
            ) : (
              <div className="space-y-2">
                {job.event_days
                  .sort((a, b) => a.event_date.localeCompare(b.event_date))
                  .map((day, idx) => (
                    <div
                      key={day.id}
                      className="flex items-center gap-4 rounded-md bg-gray-50 px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium text-gray-700 min-w-[80px]">
                        Day {idx + 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(day.event_date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {day.start_time} - {day.end_time}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Staffing Requirements */}
          <section className="border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              Staffing Requirements
            </h2>
            {job.event_staffing_requirements.length === 0 ? (
              <p className="text-sm text-gray-500">No staffing requirements defined.</p>
            ) : (
              <div className="space-y-2">
                {job.event_staffing_requirements.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {STAFFING_ROLE_LABELS[req.role] || req.role}
                      </span>
                      {req.additional_notes && (
                        <span className="text-gray-500">{'-- '}{req.additional_notes}</span>
                      )}
                    </div>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      x{req.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Equipment */}
            {job.equipment_required && job.equipment_required.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Equipment Required</h3>
                <div className="flex flex-wrap gap-2">
                  {job.equipment_required.map((eq, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      {EQUIPMENT_TYPE_LABELS[eq.type] || eq.type}
                      {eq.notes && ` (${eq.notes})`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Medic Assignment */}
          <section className="border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              Medic Assignment
            </h2>

            {/* Assigned Medics */}
            {assignedMedics.length > 0 && (
              <div className="space-y-2 mb-4">
                {assignedMedics.map((medic) => (
                  <div
                    key={medic.id}
                    className="flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        {medic.first_name} {medic.last_name}
                      </span>
                    </div>
                    {job.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedic(medic.id)}
                        disabled={medicLoading}
                        className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Assign Form */}
            {job.status !== 'completed' && job.status !== 'cancelled' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={medicIdInput}
                  onChange={(e) => setMedicIdInput(e.target.value)}
                  placeholder="Enter Medic ID (UUID)"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAssignMedic}
                  disabled={medicLoading || !medicIdInput.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {medicLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Assign
                </button>
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Medics are checked for availability via the EXCLUSION constraint. Conflicts will be reported if the medic is already booked.
            </p>
          </section>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          {/* Location */}
          <section className="border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              Location
            </h2>
            <div className="text-sm space-y-1">
              {job.location_display && (
                <p>{job.location_display}</p>
              )}
              {job.location_address && !job.location_display && (
                <p>{job.location_address}</p>
              )}
              <p className="font-medium">{job.location_postcode}</p>
              {job.location_what3words && (
                <p className="text-gray-500">
                  {`///${job.location_what3words}`}
                </p>
              )}
            </div>
          </section>

          {/* Pricing */}
          <section className="border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-gray-500" />
              Pricing
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Agreed Price</span>
                <span className="font-bold text-lg">
                  {'\u00A3'}{job.agreed_price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-gray-500">Deposit (25%)</span>
                <span className="font-medium">
                  {'\u00A3'}{depositAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Remainder (75%)</span>
                <span className="font-medium">
                  {'\u00A3'}{remainderAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <hr />
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Shield className="h-4 w-4" />
                  0% Platform Commission
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  Self-procured job -- you keep 100% of revenue
                </p>
              </div>
            </div>
          </section>

          {/* Payment Flow */}
          <section className="border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-500" />
              Payment
            </h2>

            {paymentResult ? (
              <div className="space-y-2 text-sm">
                <div className="rounded-md bg-green-50 border border-green-200 p-3">
                  <p className="font-medium text-green-700">
                    {paymentResult.mock ? 'Mock ' : ''}Payment Intent Created
                  </p>
                  <p className="text-green-600 mt-1">
                    Deposit: {'\u00A3'}{paymentResult.deposit_amount.toFixed(2)}
                  </p>
                  <p className="text-green-600">
                    Remaining: {'\u00A3'}{paymentResult.remainder_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Create a Stripe payment for the deposit amount.
                </p>
                <button
                  type="button"
                  onClick={handleCreatePayment}
                  disabled={
                    paymentLoading ||
                    job.status === 'completed' ||
                    job.status === 'cancelled'
                  }
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {paymentLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Create Deposit Payment
                </button>
              </div>
            )}
          </section>

          {/* Ratings -- Only for completed jobs */}
          {job.status === 'completed' && (
            <section className="border rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                Job Rating
              </h3>

              {/* Existing ratings display */}
              {allRatings.length > 0 && (
                <div className="space-y-3">
                  {allRatings.map((r) => (
                    <div key={r.id} className="rounded-md bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StarDisplay rating={r.rating} size="sm" />
                          <span className="text-xs text-gray-500 capitalize">
                            by {r.rater_type}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {r.review && (
                        <p className="text-sm text-gray-700 mt-2">{r.review}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Rating form */}
              <RatingForm
                jobId={job.id}
                existingRating={existingRating || undefined}
                onRatingSubmitted={fetchRatings}
              />
            </section>
          )}

          {/* Timestamps */}
          <section className="border rounded-lg p-5 text-sm text-gray-500">
            <p>Created: {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p>Updated: {new Date(job.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
