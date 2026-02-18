'use client';

/**
 * Admin Booking Detail Page
 *
 * Shows full booking information plus the pre-event medical brief form.
 * Linked from the bookings list table.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Calendar, Clock, MapPin, Building2, User, Star,
  Loader2, ClipboardList, Tag, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useOrg } from '@/contexts/org-context';
import BookingBriefForm from '@/components/bookings/booking-brief-form';
import { VERTICAL_LABELS } from '@/lib/booking/vertical-requirements';
import type { BookingVerticalId } from '@/lib/booking/vertical-requirements';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  site_name: string;
  site_address: string;
  site_postcode: string;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_hours: number;
  base_rate: number;
  urgency_premium_percent: number;
  subtotal: number;
  vat: number;
  total: number;
  status: string;
  special_notes: string | null;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
  event_vertical: string | null;
}

interface BookingDetail {
  booking: Booking;
  client: { company_name: string; contact_name: string; contact_email: string } | null;
  medic: { first_name: string; last_name: string; star_rating: number | null } | null;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  confirmed:   'bg-green-500/20 text-green-300 border-green-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completed:   'bg-gray-500/20 text-gray-300 border-gray-600/30',
  cancelled:   'bg-red-500/20 text-red-300 border-red-500/30',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-500/20 text-gray-300 border-gray-600/30';
  return (
    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border capitalize ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params.id;
  const { industryVerticals } = useOrg();

  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (!res.ok) throw new Error('Not found');
        const data: BookingDetail = await res.json();
        setDetail(data);
      } catch {
        toast.error('Could not load booking');
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId]);

  const handleGenerateStatsSheet = async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('motorsport-stats-sheet-generator', {
        body: { booking_id: bookingId },
      });
      if (error) throw error;
      if (data?.signed_url) {
        window.open(data.signed_url, '_blank');
        toast.success('Medical Statistics Sheet generated');
      }
    } catch (err: unknown) {
      toast.error('Failed to generate Medical Statistics Sheet');
      console.error('Stats sheet error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Resolve the vertical: booking.event_vertical → org primary → 'general'
  const resolvedVertical =
    detail?.booking.event_vertical ||
    (industryVerticals && industryVerticals.length > 0 ? industryVerticals[0] : 'general');

  const verticalLabel =
    VERTICAL_LABELS[resolvedVertical as BookingVerticalId] ?? resolvedVertical;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <p className="text-gray-400">Booking not found.</p>
      </div>
    );
  }

  const { booking, client, medic } = detail;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/bookings"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Bookings
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">{booking.site_name}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-gray-400 text-sm flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {booking.site_address}, {booking.site_postcode}
            </p>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-8">

        {/* ── Key details grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Shift info */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Shift
            </h2>
            <p className="text-white font-semibold text-sm">
              {new Date(booking.shift_date).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            <p className="text-gray-300 text-sm mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              {booking.shift_start_time} – {booking.shift_end_time}
              <span className="text-gray-500">({booking.shift_hours}h)</span>
            </p>
            {booking.event_vertical && (
              <div className="mt-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs text-teal-300 font-medium">{verticalLabel}</span>
              </div>
            )}
          </div>

          {/* Client */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Client
            </h2>
            {client ? (
              <>
                <p className="text-white font-semibold text-sm">{client.company_name}</p>
                <p className="text-gray-300 text-sm mt-1">{client.contact_name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{client.contact_email}</p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No client data</p>
            )}
          </div>

          {/* Medic */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Assigned Medic
            </h2>
            {medic ? (
              <>
                <p className="text-white font-semibold text-sm">
                  {medic.first_name} {medic.last_name}
                </p>
                {medic.star_rating && (
                  <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400" />
                    {medic.star_rating.toFixed(1)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm">Not yet assigned</p>
            )}
          </div>
        </div>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Pricing</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Base rate', value: `£${Number(booking.base_rate).toFixed(2)}/hr` },
              { label: 'Urgency premium', value: `${booking.urgency_premium_percent}%` },
              { label: 'Subtotal (ex. VAT)', value: `£${Number(booking.subtotal).toFixed(2)}` },
              { label: 'Total (inc. VAT)', value: `£${Number(booking.total).toFixed(2)}`, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="bg-gray-900/40 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-lg font-bold ${highlight ? 'text-white' : 'text-gray-200'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Site contact + special notes ─────────────────────────────────── */}
        {(booking.site_contact_name || booking.special_notes || booking.confined_space_required || booking.trauma_specialist_required) && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Site Details</h2>
            {booking.site_contact_name && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>{booking.site_contact_name}</span>
                {booking.site_contact_phone && (
                  <a href={`tel:${booking.site_contact_phone}`} className="text-blue-400 hover:text-blue-300 font-medium">
                    {booking.site_contact_phone}
                  </a>
                )}
              </div>
            )}
            {(booking.confined_space_required || booking.trauma_specialist_required) && (
              <div className="flex flex-wrap gap-2">
                {booking.confined_space_required && (
                  <span className="text-xs font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-full">
                    Confined Space Required
                  </span>
                )}
                {booking.trauma_specialist_required && (
                  <span className="text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-full">
                    Trauma Specialist Required
                  </span>
                )}
              </div>
            )}
            {booking.special_notes && (
              <p className="text-sm text-gray-300 bg-gray-900/40 rounded-lg p-3 whitespace-pre-wrap">
                {booking.special_notes}
              </p>
            )}
          </div>
        )}

        {/* ── Motorsport Stats Sheet ───────────────────────────────────────── */}
        {detail?.booking.event_vertical === 'motorsport' && (
          <div className="flex">
            <Button
              onClick={handleGenerateStatsSheet}
              disabled={statsLoading}
              variant="outline"
              className="mt-0"
            >
              {statsLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Generate Medical Statistics Sheet
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── Pre-Event Medical Brief ───────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            Pre-Event Medical Brief
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6">
            <BookingBriefForm
              bookingId={bookingId}
              vertical={resolvedVertical}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
