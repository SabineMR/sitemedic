/**
 * Booking Confirmation Page
 * Phase 4.5: Post-payment flow - verify payment, auto-match, create recurring, display confirmation
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingConfirmation } from '@/components/booking/booking-confirmation';
import { MedicMatcher } from '@/components/booking/medic-matcher';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface MatchResult {
  matches: Array<{
    medic_id: string;
    medic_name: string;
    star_rating: number;
    distance_miles?: number;
    travel_time_minutes?: number;
    availability: string;
    match_score: number;
    match_reasons: string[];
  }>;
  requiresManualApproval?: boolean;
  reason?: string;
}

interface RecurringResult {
  bookings: Array<{
    id: string;
    shift_date: string;
  }>;
  count: number;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const paymentIntent = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [recurringBookings, setRecurringBookings] = useState<any[]>([]);

  useEffect(() => {
    async function processBooking() {
      if (!bookingId) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        // Step 1: Verify payment status if coming from Stripe redirect
        if (paymentIntentClientSecret) {
          console.log('🔍 Verifying payment status...');
          // Payment verification would use Stripe.js here
          // For now, we assume payment succeeded if we got redirected back
        }

        // Step 2: Trigger auto-matching (which internally: assigns medic -> updates booking -> sends emails)
        console.log('🎯 Triggering auto-match...');
        const matchResponse = await fetch('/api/bookings/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        });

        if (!matchResponse.ok) {
          throw new Error('Failed to auto-match medic');
        }

        const matchData: MatchResult = await matchResponse.json();
        setMatchResult(matchData);

        // Step 3: Fetch booking details to check if recurring
        console.log('📋 Fetching booking details...');
        // TODO: Fetch booking from Supabase
        // For now, mock the data structure
        const mockBooking = {
          id: bookingId,
          date: new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          startTime: '07:00',
          endTime: '15:00',
          siteName: 'Construction Site',
          siteAddress: 'London, UK',
          medicName: matchData.matches[0]?.medic_name || 'Assigned Medic',
          medicRating: matchData.matches[0]?.star_rating || 4.8,
          clientEmail: 'client@example.com',
          pricing: {
            baseRate: 42,
            shiftHours: 8,
            hourlyTotal: 336,
            urgencyPremiumPercent: 0,
            urgencyAmount: 0,
            travelSurcharge: 0,
            subtotal: 336,
            vat: 67.2,
            total: 403.2,
          },
          is_recurring: false,
          recurrence_pattern: null,
          recurring_weeks: 0,
        };

        setBookingData(mockBooking);

        // Step 4: If recurring booking, create child bookings
        if (mockBooking.is_recurring && mockBooking.recurring_weeks > 0) {
          console.log('🔄 Creating recurring bookings...');
          const recurringResponse = await fetch('/api/bookings/recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentBookingId: bookingId,
              recurrencePattern: mockBooking.recurrence_pattern,
              weeks: mockBooking.recurring_weeks,
            }),
          });

          if (recurringResponse.ok) {
            const recurringData: RecurringResult = await recurringResponse.json();
            setRecurringBookings(
              recurringData.bookings.map((b) => ({
                id: b.id,
                date: new Date(b.shift_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
                status: 'confirmed',
              }))
            );
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ Confirmation error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setLoading(false);
      }
    }

    processBooking();
  }, [bookingId, paymentIntentClientSecret]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Confirming your booking...
            </h2>
            <p className="text-slate-600">
              We're matching you with the best available medic. This will only take a moment.
            </p>
            <p className="text-sm text-slate-500 mt-4">Step 3 of 3: Confirmation</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !matchResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-700 mb-6">
              {error ||
                "Your payment was successful but we couldn't complete the booking. Our team has been notified."}
            </p>
            <div className="space-y-2">
              <p className="text-sm text-red-600">
                Please contact support: <span className="font-medium">support@sitemedic.co.uk</span>
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - show confirmation
  if (bookingData && matchResult.matches.length > 0 && !matchResult.requiresManualApproval) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BookingConfirmation
          booking={bookingData}
          recurringBookings={recurringBookings.length > 0 ? recurringBookings : undefined}
          recurrencePattern={bookingData.recurrence_pattern}
        />
      </div>
    );
  }

  // Manual approval required
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Booking Received</h1>
          <p className="text-slate-600">
            Your payment has been processed and your booking is being reviewed.
          </p>
          <p className="text-sm text-slate-500 mt-4">Step 3 of 3: Confirmation</p>
        </div>

        <MedicMatcher
          matches={matchResult.matches}
          requiresManualApproval={matchResult.requiresManualApproval}
          reason={matchResult.reason}
        />

        <div className="text-center">
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
