'use client';

/**
 * Out-of-Territory Approval Component
 * Phase 6.5-05: Admin approval interface for high-cost out-of-territory bookings
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import { TravelCalculation } from '@/lib/bookings/out-of-territory';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  MapPin,
  Clock,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface OutOfTerritoryApprovalProps {
  bookingId: string;
}

interface BookingDetails {
  id: string;
  site_name: string;
  site_postcode: string;
  shift_date: string;
  shift_hours: number;
  total: number;
  status: string;
  requires_manual_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  client_id: string;
  // Client details
  client?: {
    company_name: string;
  };
  // Out-of-territory calculation data
  out_of_territory_cost?: number;
  out_of_territory_type?: 'travel_bonus' | 'room_board';
  travel_calculation?: TravelCalculation;
}

export function OutOfTerritoryApproval({ bookingId }: OutOfTerritoryApprovalProps) {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          client:clients(company_name)
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError) throw fetchError;

      setBooking(data as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!booking || !booking.travel_calculation) return;

    const calc = booking.travel_calculation;

    // Check admin override limit (75%)
    if (calc.cost_percentage > 75) {
      alert('Cannot approve: Cost exceeds 75% admin override limit. Escalation required.');
      return;
    }

    setActionLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          requires_manual_approval: false,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          out_of_territory_cost: calc.total_cost,
          out_of_territory_type: calc.recommended_option === 'deny' ? null : calc.recommended_option,
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      alert('Booking approved successfully');
      await fetchBookingDetails();
      setShowApprovalDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!denialReason.trim()) {
      alert('Please provide a reason for denial');
      return;
    }

    setActionLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: denialReason,
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      alert('Booking denied successfully');
      await fetchBookingDetails();
      setShowDenyDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deny booking');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Approval Details...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !booking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Out-of-Territory Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error || 'Booking not found'}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const calc = booking.travel_calculation;
  const isApproved = booking.status === 'confirmed' && !booking.requires_manual_approval;
  const isDenied = booking.status === 'cancelled';

  const getStatusBadge = () => {
    if (isApproved) {
      return <Badge className="bg-green-600">Approved</Badge>;
    }
    if (isDenied) {
      return <Badge variant="destructive">Denied</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
  };

  const getCostPercentageColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-red-600';
    if (percentage >= 50) return 'bg-orange-600';
    if (percentage >= 25) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const canApprove = !isApproved && !isDenied && calc && calc.cost_percentage <= 75;
  const requiresOverride = calc && calc.cost_percentage >= 50;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Out-of-Territory Approval</CardTitle>
          {getStatusBadge()}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Booking Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Site</p>
                <p className="font-medium">{booking.site_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">{booking.client?.company_name || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Shift Date</p>
                  <p className="font-medium">
                    {new Date(booking.shift_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Hours</p>
                <p className="font-medium">{booking.shift_hours}h</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium text-lg">£{booking.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Out-of-Territory Calculation */}
          {calc && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Out-of-Territory Cost Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Distance</p>
                      <p className="font-medium">{calc.distance_miles} miles</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Travel time</p>
                      <p className="font-medium">
                        {Math.floor(calc.travel_time_minutes / 60)}h{' '}
                        {calc.travel_time_minutes % 60}m
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-2 bg-muted p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Travel bonus cost</span>
                    <span className="font-medium">£{calc.travel_cost.toFixed(2)}</span>
                  </div>
                  {calc.room_board_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Room & board cost</span>
                      <span className="font-medium">£{calc.room_board_cost.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Recommended option</span>
                    <span className="capitalize">{calc.recommended_option.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Cost Percentage Analysis */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Cost Percentage
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Additional cost</span>
                    <span className="font-medium">£{calc.total_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shift value</span>
                    <span className="font-medium">£{calc.shift_value.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost percentage</span>
                    <span className="font-bold text-lg">{calc.cost_percentage}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                    <div
                      className={`h-3 rounded-full transition-all ${getCostPercentageColor(calc.cost_percentage)}`}
                      style={{ width: `${Math.min(calc.cost_percentage, 100)}%` }}
                    ></div>
                  </div>

                  {/* Threshold indicators */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span className="text-orange-600">50% (auto-deny)</span>
                    <span className="text-red-600">75% (hard limit)</span>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {calc.cost_percentage >= 75 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cost exceeds 75% hard limit. This booking cannot be approved without escalation.
                  </AlertDescription>
                </Alert>
              )}

              {calc.cost_percentage >= 50 && calc.cost_percentage < 75 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cost exceeds 50% threshold. Admin override required for approval.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <Separator />

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this approval decision..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isApproved || isDenied}
            />
          </div>

          {/* Audit Trail */}
          {(booking.approved_by || isDenied) && (
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold">Audit Trail</h3>
              <div className="text-muted-foreground space-y-1">
                <p>Created: {new Date(booking.created_at).toLocaleString()}</p>
                {booking.approved_by && (
                  <p>
                    Approved by: {booking.approved_by} on{' '}
                    {new Date(booking.approved_at!).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {!isApproved && !isDenied && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowApprovalDialog(true)}
                disabled={!canApprove}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => setShowDenyDialog(true)}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Deny
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {requiresOverride ? 'Override Denial Recommendation?' : 'Approve Booking?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {requiresOverride ? (
                <>
                  This booking has a cost percentage of{' '}
                  <strong>{calc?.cost_percentage}%</strong>, which exceeds the 50%
                  auto-deny threshold. Are you sure you want to override this
                  recommendation and approve the booking?
                </>
              ) : (
                'This will confirm the booking and notify the client.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? 'Processing...' : 'Approve Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deny Confirmation Dialog */}
      <AlertDialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deny Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for denying this booking. The client will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="denialReason">Denial Reason</Label>
            <Textarea
              id="denialReason"
              placeholder="e.g., Cost exceeds acceptable threshold for this shift..."
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeny}
              disabled={actionLoading || !denialReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? 'Processing...' : 'Deny Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
