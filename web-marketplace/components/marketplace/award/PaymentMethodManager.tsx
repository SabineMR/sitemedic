/**
 * PaymentMethodManager
 * Phase 35: Award Flow & Payment — Plan 03
 *
 * Dashboard component for marketplace clients to view and update
 * their saved payment method. Shows current card, upcoming remainder
 * charges, and allows updating the card before auto-charge.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface SavedMethod {
  id: string;
  stripe_payment_method_id: string;
  is_default: boolean;
  card_brand: string;
  card_last_four: string;
  card_expiry_month: number;
  card_expiry_year: number;
}

interface UpcomingCharge {
  id: string;
  site_name: string;
  remainder_amount: number;
  remainder_due_at: string;
  shift_date: string;
  marketplace_event_id: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatCardBrand(brand: string): string {
  const brands: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };
  return brands[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
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

export default function PaymentMethodManager() {
  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [upcomingCharges, setUpcomingCharges] = useState<UpcomingCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/marketplace/payments/method');
      if (!res.ok) throw new Error('Failed to load payment methods');
      const data = await res.json();
      setMethods(data.methods || []);
      setUpcomingCharges(data.upcomingCharges || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const defaultMethod = methods.find((m) => m.is_default);

  // =========================================================================
  // Loading
  // =========================================================================

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-100 rounded" />
            <div className="h-8 bg-gray-50 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // =========================================================================
  // Error
  // =========================================================================

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-4">
      {/* Saved Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {defaultMethod ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-14 items-center justify-center rounded border bg-gray-50 text-xs font-bold text-gray-600">
                  {formatCardBrand(defaultMethod.card_brand)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCardBrand(defaultMethod.card_brand)} ending in {defaultMethod.card_last_four}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expires {String(defaultMethod.card_expiry_month).padStart(2, '0')}/{defaultMethod.card_expiry_year}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <CreditCard className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No payment method on file</p>
              <p className="text-xs text-gray-400 mt-1">
                A payment method will be saved when you pay a deposit
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Charges */}
      {upcomingCharges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingCharges.map((charge) => {
                const isDueSoon =
                  new Date(charge.remainder_due_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
                return (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{charge.site_name}</p>
                      <p className="text-xs text-gray-500">
                        Due: {formatDate(charge.remainder_due_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(charge.remainder_amount)}
                      </p>
                      {isDueSoon && (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          Due soon
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
