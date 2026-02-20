/**
 * AwardedEventDetails
 * Phase 35: Award Flow & Payment — Plan 04
 *
 * Dashboard component showing awarded event details with client
 * contact reveal for winning company. Shows payment summary for
 * event poster (client view).
 *
 * Contact details are ONLY shown when both:
 * 1. Event status is 'awarded'
 * 2. Deposit has been paid
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ExternalLink,
  Clock,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface AwardedData {
  event: {
    id: string;
    event_name: string;
    event_type: string;
    location_address: string | null;
    location_postcode: string | null;
    event_description: string | null;
    status: string;
    days: Array<{ event_date: string; start_time: string; end_time: string }>;
  };
  award: {
    awarded_at: string | null;
    total_price: number;
    deposit_amount: number | null;
    deposit_percent: number | null;
    remainder_amount: number | null;
    remainder_due_at: string | null;
  };
  client: {
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
  } | null;
  company: {
    name: string;
  } | null;
  booking: {
    id: string;
    status: string;
  } | null;
  contactRevealed: boolean;
  viewerRole: 'company' | 'client';
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

// =============================================================================
// Component
// =============================================================================

interface AwardedEventDetailsProps {
  eventId: string;
}

export default function AwardedEventDetails({ eventId }: AwardedEventDetailsProps) {
  const [data, setData] = useState<AwardedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/marketplace/events/${eventId}/awarded`);
        if (!res.ok) {
          if (res.status === 403) {
            setError('You do not have access to this awarded event.');
          } else if (res.status === 404) {
            setError('Awarded event not found.');
          } else {
            setError('Failed to load event details.');
          }
          return;
        }
        setData(await res.json());
      } catch {
        setError('Failed to load event details.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [eventId]);

  // =========================================================================
  // Loading
  // =========================================================================

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">{error || 'Unknown error'}</p>
      </div>
    );
  }

  // =========================================================================
  // Company View (Winning Company)
  // =========================================================================

  if (data.viewerRole === 'company') {
    return (
      <div className="space-y-4">
        {/* Award Banner */}
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">You&apos;ve been awarded this event!</p>
            <p className="text-sm text-green-700">
              {data.award.awarded_at
                ? `Awarded on ${formatDate(data.award.awarded_at)}`
                : 'Awarded'}
            </p>
          </div>
        </div>

        {/* Client Contact Details */}
        {data.contactRevealed && data.client ? (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                Client Contact Details
                <Badge className="bg-green-100 text-green-700 text-xs">Revealed</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700 w-16">Name:</span>
                <span className="text-gray-900">{data.client.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${data.client.email}`} className="text-blue-600 hover:text-blue-800">
                  {data.client.email}
                </a>
              </div>
              {data.client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${data.client.phone}`} className="text-blue-600 hover:text-blue-800">
                    {data.client.phone}
                  </a>
                </div>
              )}
              {data.client.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{data.client.address}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 pt-2 border-t">
                Contact the client to coordinate event logistics.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="py-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-700">
                Contact details will be available once the deposit payment is confirmed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Event Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.event.days.map((day) => (
              <div key={day.event_date} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{formatDate(day.event_date)}</span>
                <span className="text-gray-500">
                  {day.start_time} - {day.end_time}
                </span>
              </div>
            ))}
            {data.event.location_address && (
              <div className="flex items-center gap-2 text-sm pt-2 border-t">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{data.event.location_address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total awarded</span>
                <span className="font-semibold">{formatCurrency(data.award.total_price)}</span>
              </div>
              {data.award.deposit_amount != null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Deposit paid ({data.award.deposit_percent}%)
                  </span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(data.award.deposit_amount)}
                  </span>
                </div>
              )}
              {data.award.remainder_amount != null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Remainder due</span>
                  <span className="font-medium">
                    {formatCurrency(data.award.remainder_amount)}
                  </span>
                </div>
              )}
              {data.award.remainder_due_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Remainder date</span>
                  <span className="text-gray-500">{formatDate(data.award.remainder_due_at)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Booking Link */}
        {data.booking && (
          <Link href={`/dashboard/bookings/${data.booking.id}`}>
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              View Booking in Dashboard
            </Button>
          </Link>
        )}
      </div>
    );
  }

  // =========================================================================
  // Client View (Event Poster)
  // =========================================================================

  return (
    <div className="space-y-4">
      {/* Award Banner */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-blue-800">Event Awarded</p>
          {data.company && (
            <p className="text-sm text-blue-700">
              Awarded to <strong>{data.company.name}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold">{formatCurrency(data.award.total_price)}</span>
            </div>
            {data.award.deposit_amount != null && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Deposit paid ({data.award.deposit_percent}%)
                </span>
                <span className="font-medium text-green-600">
                  {formatCurrency(data.award.deposit_amount)}
                </span>
              </div>
            )}
            {data.award.remainder_amount != null && (
              <div className="flex justify-between">
                <span className="text-gray-600">Remainder due</span>
                <span className="font-medium">
                  {formatCurrency(data.award.remainder_amount)}
                </span>
              </div>
            )}
            {data.award.remainder_due_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Remainder date</span>
                <span className="text-gray-500">{formatDate(data.award.remainder_due_at)}</span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t">
            <Link
              href="/marketplace/payments"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage payment method
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Awarded Company */}
      {data.company && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Awarded Company</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-gray-900">{data.company.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              The awarded company has been notified and will contact you to arrange logistics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
