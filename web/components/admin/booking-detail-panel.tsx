'use client';

/**
 * BookingDetailPanel
 *
 * Admin booking detail Sheet (slide-over from right).
 * Shows full operational context for a booking: site contact info,
 * approval reason, cancellation details, refund amount, and more.
 */

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Phone,
  User,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  XCircle,
  DollarSign,
  Building2,
  UserPlus,
} from 'lucide-react';
import CurrencyWithTooltip from '@/components/CurrencyWithTooltip';
import type { BookingWithRelations } from '@/lib/queries/admin/bookings';
import { useAvailableMedics } from '@/lib/queries/admin/bookings';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Activity } from 'lucide-react';
import { What3WordsDisplay } from '@/components/booking/what3words-display';
import { createClient } from '@/lib/supabase/client';

interface BookingDetailPanelProps {
  booking: BookingWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Status badge config — matches booking-approval-table.tsx colour scheme
const STATUS_BADGES: Record<
  string,
  { color: string; label: string; icon: React.ReactNode }
> = {
  pending: {
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    label: 'Pending',
    icon: <Clock className="w-3 h-3" />,
  },
  confirmed: {
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    label: 'Confirmed',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  in_progress: {
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    label: 'In Progress',
    icon: <Activity className="w-3 h-3" />,
  },
  completed: {
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    label: 'Completed',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  cancelled: {
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    label: 'Cancelled',
    icon: <XCircle className="w-3 h-3" />,
  },
};

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
};

export function BookingDetailPanel({
  booking,
  open,
  onOpenChange,
}: BookingDetailPanelProps) {
  const [recurringChain, setRecurringChain] = useState<Array<{
    id: string;
    shift_date: string;
    shift_start_time: string;
    shift_end_time: string;
    status: string;
  }>>([]);
  const [chainLoading, setChainLoading] = useState(false);

  // Assign Medic Manually state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMedicId, setSelectedMedicId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch available medics for the booking's shift date
  const { data: availableMedics = [] } = useAvailableMedics(
    booking?.shift_date || ''
  );

  useEffect(() => {
    if (!open || !booking?.is_recurring) {
      setRecurringChain([]);
      return;
    }

    async function fetchChain() {
      setChainLoading(true);
      try {
        const supabase = createClient();
        // Resolve root booking: if this is a child, use parent_booking_id; otherwise use this booking's id
        const rootId = booking!.parent_booking_id ?? booking!.id;

        const { data } = await supabase
          .from('bookings')
          .select('id, shift_date, shift_start_time, shift_end_time, status')
          .or(`id.eq.${rootId},parent_booking_id.eq.${rootId}`)
          .order('shift_date', { ascending: true });

        setRecurringChain(data || []);
      } catch (err) {
        console.error('Failed to fetch recurring chain:', err);
      } finally {
        setChainLoading(false);
      }
    }

    fetchChain();
  }, [open, booking?.id, booking?.is_recurring, booking?.parent_booking_id]);

  const handleAssignMedic = async () => {
    if (!booking || !selectedMedicId) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      const response = await fetch('/api/bookings/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          overrideMedicId: selectedMedicId,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign medic');
      }
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setAssignDialogOpen(false);
      setSelectedMedicId('');
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign medic');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!booking) return null;

  const statusBadge = STATUS_BADGES[booking.status] ?? STATUS_BADGES.pending;

  const medicName =
    booking.medics
      ? `${booking.medics.first_name} ${booking.medics.last_name}`
      : 'Unassigned';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[500px] sm:w-[600px] bg-gray-900 border-gray-700 overflow-y-auto"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <SheetHeader className="pb-4 mb-4 border-b border-gray-700/50">
          <div className="flex items-start justify-between gap-3 pr-6">
            <SheetTitle className="text-white text-xl leading-tight">
              {booking.site_name}
            </SheetTitle>
            <Badge className={`${statusBadge.color} flex items-center gap-1.5 shrink-0`}>
              {statusBadge.icon}
              {statusBadge.label}
            </Badge>
          </div>
          <SheetDescription className="text-gray-500 text-xs">
            Booking ID: {booking.id}
          </SheetDescription>
        </SheetHeader>

        {/* ── Date & Time ─────────────────────────────────────── */}
        <section className="border-b border-gray-700/50 pb-4 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Date &amp; Time
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span suppressHydrationWarning>
                {new Date(booking.shift_date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span>
                {booking.shift_start_time.slice(0, 5)} &ndash;{' '}
                {booking.shift_end_time.slice(0, 5)}
              </span>
              <span className="text-gray-500 text-sm">
                ({booking.shift_hours}h)
              </span>
            </div>
          </div>
        </section>

        {/* ── Site Details ─────────────────────────────────────── */}
        <section className="border-b border-gray-700/50 pb-4 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Site Details
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span>
                {booking.site_address},{' '}
                <span className="text-gray-400">{booking.site_postcode}</span>
              </span>
            </div>

            {booking.site_contact_name && (
              <div className="flex items-center gap-2 text-gray-300">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{booking.site_contact_name}</span>
              </div>
            )}

            {booking.site_contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <a
                  href={`tel:${booking.site_contact_phone}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {booking.site_contact_phone}
                </a>
              </div>
            )}

            {booking.what3words_address && (
              <div>
                <p className="text-xs text-gray-400 mb-1">What3Words</p>
                <What3WordsDisplay address={booking.what3words_address} />
              </div>
            )}
          </div>
        </section>

        {/* ── Client & Medic ───────────────────────────────────── */}
        <section className="border-b border-gray-700/50 pb-4 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Client &amp; Medic
          </h3>
          <div className="space-y-2">
            {booking.clients?.company_name && (
              <div className="flex items-center gap-2 text-gray-300">
                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{booking.clients.company_name}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span
                className={booking.medics ? 'text-white' : 'text-yellow-400'}
              >
                {medicName}
              </span>
              {booking.auto_matched && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs ml-1">
                  Auto-matched
                </Badge>
              )}
            </div>

            {booking.match_score != null && (
              <div className="text-sm text-gray-400 pl-6">
                Match score: {booking.match_score}
              </div>
            )}

            {(!booking.medics || booking.requires_manual_approval) && (
              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAssignDialogOpen(true);
                    setAssignError(null);
                    setSelectedMedicId('');
                  }}
                  className="w-full bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20 hover:text-blue-300"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Medic Manually
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────── */}
        <section className="border-b border-gray-700/50 pb-4 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Pricing
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="font-medium">Total</span>
              </div>
              <CurrencyWithTooltip amount={booking.total} />
            </div>

            <div className="flex items-center justify-between text-gray-400 text-sm pl-6">
              <span>Platform fee</span>
              <CurrencyWithTooltip amount={booking.platform_fee} />
            </div>

            <div className="flex items-center justify-between text-gray-400 text-sm pl-6">
              <span>Medic payout</span>
              <CurrencyWithTooltip amount={booking.medic_payout} />
            </div>

            {booking.travel_surcharge > 0 && (
              <div className="flex items-center justify-between text-gray-400 text-sm pl-6">
                <span>Travel surcharge</span>
                <CurrencyWithTooltip amount={booking.travel_surcharge} />
              </div>
            )}

            {booking.urgency_premium_percent > 0 && (
              <div className="flex items-center justify-between text-gray-400 text-sm pl-6">
                <span>Urgency premium ({booking.urgency_premium_percent}%)</span>
                <span className="text-orange-400">Applied</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Approval Details (conditional) ───────────────────── */}
        {booking.requires_manual_approval && (
          <section className="border-b border-gray-700/50 pb-4 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Approval Details
            </h3>
            <div className="space-y-3">
              {booking.approval_reason && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-blue-300 text-sm">{booking.approval_reason}</p>
                  </div>
                </div>
              )}

              {booking.approved_by && (
                <div className="text-sm text-gray-400">
                  Approved by:{' '}
                  <span className="text-gray-300">{booking.approved_by}</span>
                </div>
              )}

              {booking.approved_at && (
                <div className="text-sm text-gray-400">
                  Approved at:{' '}
                  <span className="text-gray-300" suppressHydrationWarning>
                    {new Date(booking.approved_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Cancellation Details (conditional) ───────────────── */}
        {booking.status === 'cancelled' && (
          <section className="border-b border-gray-700/50 pb-4 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Cancellation Details
            </h3>
            <div className="space-y-3">
              {booking.cancellation_reason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">{booking.cancellation_reason}</p>
                  </div>
                </div>
              )}

              {booking.cancelled_by && (
                <div className="text-sm text-gray-400">
                  Cancelled by:{' '}
                  <span className="text-gray-300">{booking.cancelled_by}</span>
                </div>
              )}

              {booking.cancelled_at && (
                <div className="text-sm text-gray-400">
                  Cancelled at:{' '}
                  <span className="text-gray-300" suppressHydrationWarning>
                    {new Date(booking.cancelled_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Refund (conditional — only when > 0) ─────────────── */}
        {booking.refund_amount > 0 && (
          <section className="border-b border-gray-700/50 pb-4 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Refund
            </h3>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-green-400 font-medium">
                <CurrencyWithTooltip amount={booking.refund_amount} />
              </span>
            </div>
          </section>
        )}

        {/* ── Special Notes (conditional) ───────────────────────── */}
        {booking.special_notes && (
          <section className="border-b border-gray-700/50 pb-4 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Special Notes
            </h3>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-gray-300 text-sm whitespace-pre-wrap">
                {booking.special_notes}
              </p>
            </div>
          </section>
        )}

        {/* ── Recurring Chain (conditional) ─────────────────────── */}
        {booking.is_recurring && (
          <div className="border-b border-gray-700/50 pb-4 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Recurring Chain
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                {booking.recurrence_pattern === 'biweekly' ? 'Bi-weekly' : 'Weekly'}
              </Badge>
              {booking.recurring_until && (
                <span className="text-sm text-gray-400">
                  until{' '}
                  <span suppressHydrationWarning>
                    {new Date(booking.recurring_until).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </span>
              )}
            </div>

            {chainLoading ? (
              <p className="text-sm text-gray-500">Loading booking chain...</p>
            ) : recurringChain.length > 0 ? (
              <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 border-b border-gray-700/50">
                    <tr>
                      <th className="text-left p-2 text-xs text-gray-400 font-semibold">Date</th>
                      <th className="text-left p-2 text-xs text-gray-400 font-semibold">Time</th>
                      <th className="text-left p-2 text-xs text-gray-400 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {recurringChain.map((instance) => {
                      const isCurrentBooking = instance.id === booking.id;
                      const statusColors: Record<string, string> = {
                        pending: 'bg-yellow-500/20 text-yellow-400',
                        confirmed: 'bg-green-500/20 text-green-400',
                        in_progress: 'bg-cyan-500/20 text-cyan-400',
                        completed: 'bg-purple-500/20 text-purple-400',
                        cancelled: 'bg-red-500/20 text-red-400',
                      };
                      const statusLabel: Record<string, string> = {
                        pending: 'Pending',
                        confirmed: 'Confirmed',
                        in_progress: 'In Progress',
                        completed: 'Completed',
                        cancelled: 'Cancelled',
                        pending_payment: 'Pending Payment',
                      };

                      return (
                        <tr
                          key={instance.id}
                          className={isCurrentBooking ? 'bg-blue-500/10' : ''}
                        >
                          <td className="p-2 text-gray-300" suppressHydrationWarning>
                            {new Date(instance.shift_date).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                            {isCurrentBooking && (
                              <span className="ml-2 text-xs text-blue-400">(viewing)</span>
                            )}
                          </td>
                          <td className="p-2 text-gray-400">
                            {instance.shift_start_time?.substring(0, 5)} -{' '}
                            {instance.shift_end_time?.substring(0, 5)}
                          </td>
                          <td className="p-2">
                            <Badge className={`text-xs ${statusColors[instance.status] || 'bg-gray-500/20 text-gray-400'}`}>
                              {statusLabel[instance.status] || instance.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recurring instances found</p>
            )}

            <p className="text-xs text-gray-500 mt-2">
              {recurringChain.length} booking{recurringChain.length !== 1 ? 's' : ''} in this series
            </p>
          </div>
        )}

        {/* ── Assign Medic Dialog ────────────────────────────────── */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Assign Medic Manually</DialogTitle>
              <DialogDescription className="text-gray-400">
                Select a medic to assign to this booking. This will trigger a confirmation email to the client and medic.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Available Medics ({availableMedics.length})
                </label>
                <Select value={selectedMedicId} onValueChange={setSelectedMedicId}>
                  <SelectTrigger className="bg-gray-900/50 border-gray-700/50 text-white">
                    <SelectValue placeholder="Select a medic..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {availableMedics.map((medic) => (
                      <SelectItem
                        key={medic.id}
                        value={medic.id}
                        className="text-white hover:bg-gray-700"
                      >
                        {medic.first_name} {medic.last_name}
                        {medic.star_rating > 0 && (
                          <span className="ml-2 text-yellow-400 text-xs">
                            {medic.star_rating.toFixed(1)} stars
                          </span>
                        )}
                      </SelectItem>
                    ))}
                    {availableMedics.length === 0 && (
                      <div className="px-2 py-3 text-sm text-gray-500 text-center">
                        No available medics for this date
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {assignError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                  {assignError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignMedic}
                disabled={!selectedMedicId || isAssigning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAssigning ? 'Assigning...' : 'Assign Medic'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
