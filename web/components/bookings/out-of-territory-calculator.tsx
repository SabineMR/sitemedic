'use client';

/**
 * Out-of-Territory Calculator Component
 * Phase 6.5-05: Display cost breakdown and recommendations for out-of-territory bookings
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TravelCalculation } from '@/lib/bookings/out-of-territory';
import { AlertTriangle, MapPin, Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface OutOfTerritoryCalculatorProps {
  medicId: string;
  sitePostcode: string;
  shiftHours: number;
  baseRate: number;
  onCalculated?: (result: TravelCalculation) => void;
}

interface CalculationResult {
  calculation: TravelCalculation;
  cached: boolean;
  medicName: string;
  medicPostcode: string;
  sitePostcode: string;
}

export function OutOfTerritoryCalculator({
  medicId,
  sitePostcode,
  shiftHours,
  baseRate,
  onCalculated,
}: OutOfTerritoryCalculatorProps) {
  const [loading, setLoading] = useState(true);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCalculation = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings/calculate-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicId,
          sitePostcode,
          shiftHours,
          baseRate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate cost');
      }

      const data: CalculationResult = await response.json();
      setCalculation(data);

      if (onCalculated) {
        onCalculated(data.calculation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculation();
  }, [medicId, sitePostcode, shiftHours, baseRate]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calculating Out-of-Territory Cost...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Out-of-Territory Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={() => fetchCalculation()}
            variant="outline"
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!calculation) {
    return null;
  }

  const calc = calculation.calculation;
  const hours = Math.floor(calc.travel_time_minutes / 60);
  const minutes = calc.travel_time_minutes % 60;

  const getRecommendationBadge = () => {
    switch (calc.recommended_option) {
      case 'travel_bonus':
        return <Badge className="bg-green-600">Travel Bonus Recommended</Badge>;
      case 'room_board':
        return <Badge className="bg-blue-600">Room & Board Recommended</Badge>;
      case 'deny':
        return <Badge variant="destructive">Booking Should Be Denied</Badge>;
    }
  };

  const getCostPercentageColor = () => {
    if (calc.cost_percentage >= 75) return 'bg-red-600';
    if (calc.cost_percentage >= 50) return 'bg-orange-600';
    if (calc.cost_percentage >= 25) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Out-of-Territory Cost Analysis</CardTitle>
        <Button
          onClick={() => fetchCalculation(true)}
          variant="ghost"
          size="sm"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Travel Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Travel Details</h3>
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
                  {hours}h {minutes}m
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {calculation.medicPostcode} → {calculation.sitePostcode}
            {calculation.cached && ' (cached)'}
          </p>
        </div>

        <Separator />

        {/* Cost Comparison */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Cost Comparison</h3>

          {/* Option 1: Travel Bonus */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Option 1: Travel Bonus</span>
              {calc.recommended_option === 'travel_bonus' && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Recommended
                </Badge>
              )}
            </div>
            <div className="pl-4 space-y-1 text-sm text-muted-foreground">
              <p>Billable miles: {Math.max(0, calc.distance_miles - 30)} miles</p>
              <p>Rate: £2/mile</p>
              <p className="font-medium text-foreground">Total: £{calc.travel_cost.toFixed(2)}</p>
            </div>
          </div>

          {/* Option 2: Room & Board (if applicable) */}
          {calc.room_board_cost > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Option 2: Room & Board</span>
                {calc.recommended_option === 'room_board' && (
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    Recommended
                  </Badge>
                )}
              </div>
              <div className="pl-4 space-y-1 text-sm text-muted-foreground">
                <p>Overnight accommodation</p>
                <p className="font-medium text-foreground">
                  Flat rate: £{calc.room_board_cost.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Recommendation */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Recommendation</h3>
          {getRecommendationBadge()}
        </div>

        <Separator />

        {/* Cost Analysis */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Cost Analysis
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total cost</span>
              <span className="font-medium">£{calc.total_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shift value</span>
              <span className="font-medium">£{calc.shift_value.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cost percentage</span>
              <span className="font-bold">{calc.cost_percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className={`h-2.5 rounded-full ${getCostPercentageColor()}`}
                style={{ width: `${Math.min(calc.cost_percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Denial Warning */}
        {calc.recommended_option === 'deny' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This booking exceeds the 50% cost threshold and should be denied. Admin
              override required for approval.
            </AlertDescription>
          </Alert>
        )}

        {/* Info disclaimer */}
        <p className="text-xs text-muted-foreground">
          Cost calculation based on Google Maps distance and current business rules. First
          30 miles are included in base rate.
        </p>
      </CardContent>
    </Card>
  );
}
