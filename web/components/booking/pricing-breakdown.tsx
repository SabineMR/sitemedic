'use client';

/**
 * Pricing Breakdown Component
 * Phase 4.5: Real-time pricing display
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PricingBreakdown as PricingData } from '@/lib/booking/types';

interface PricingBreakdownProps {
  pricing: PricingData | null;
}

export function PricingBreakdown({ pricing }: PricingBreakdownProps) {
  if (!pricing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select shift date and times to see pricing
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Pricing Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Base Rate */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Base rate (£{pricing.baseRate}/hr × {pricing.shiftHours}h)
          </span>
          <span className="font-medium">£{pricing.hourlyTotal.toFixed(2)}</span>
        </div>

        {/* Urgency Premium */}
        {pricing.urgencyPremiumPercent > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Urgency premium ({pricing.urgencyPremiumPercent}%)
            </span>
            <span className="font-medium text-orange-600">
              +£{pricing.urgencyAmount.toFixed(2)}
            </span>
          </div>
        )}

        {/* Travel Surcharge */}
        {pricing.travelSurcharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Travel surcharge</span>
            <span className="font-medium">+£{pricing.travelSurcharge.toFixed(2)}</span>
          </div>
        )}

        <Separator />

        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">£{pricing.subtotal.toFixed(2)}</span>
        </div>

        {/* VAT */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">VAT (20%)</span>
          <span className="font-medium">£{pricing.vat.toFixed(2)}</span>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between">
          <span className="text-lg font-bold">Total</span>
          <span className="text-lg font-bold">£{pricing.total.toFixed(2)}</span>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground">
          Final price may vary based on site location and medic assignment
        </p>
      </CardContent>
    </Card>
  );
}
