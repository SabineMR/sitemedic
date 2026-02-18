/**
 * Client Invoices Page
 *
 * Placeholder for client invoice viewing.
 * Displays completed bookings as invoice items.
 */

'use client';

import { useClientBookings } from '@/lib/queries/client/bookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download } from 'lucide-react';

export default function ClientInvoicesPage() {
  const { data: bookings, isLoading, error } = useClientBookings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading invoices...</span>
      </div>
    );
  }

  // Filter to completed bookings as invoiceable items
  const completedBookings = (bookings || []).filter(
    (b) => b.status === 'completed'
  );

  const formatGBP = (amount: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">
          View invoices for completed bookings
        </p>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <p className="text-red-700">Failed to load invoices.</p>
          </CardContent>
        </Card>
      ) : completedBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
            <p className="text-sm text-muted-foreground">
              Invoices will appear here once bookings are completed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {completedBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.site_name}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Paid
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.shift_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      - {booking.shift_hours}hrs
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatGBP(booking.total)}</p>
                    <p className="text-xs text-muted-foreground">inc. VAT</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total */}
          <Card className="border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between font-bold">
                <span>Total Invoiced</span>
                <span className="text-lg">
                  {formatGBP(
                    completedBookings.reduce((sum, b) => sum + b.total, 0)
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
