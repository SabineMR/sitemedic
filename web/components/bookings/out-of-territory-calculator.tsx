'use client';

import { useState, useEffect } from 'react';
import { TravelCalculation } from '@/lib/bookings/out-of-territory';

interface OutOfTerritoryCalculatorProps {
  medicId: string;
  sitePostcode: string;
  shiftHours: number;
  baseRate: number;
  onCalculated?: (result: TravelCalculation) => void;
}

export function OutOfTerritoryCalculator({
  medicId,
  sitePostcode,
  shiftHours,
  baseRate,
  onCalculated,
}: OutOfTerritoryCalculatorProps) {
  const [loading, setLoading] = useState(true);
  const [calculation, setCalculation] = useState<TravelCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [medicPostcode, setMedicPostcode] = useState<string>('');
  const [cached, setCached] = useState(false);

  const fetchCalculation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings/calculate-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicId, sitePostcode, shiftHours, baseRate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate cost');
      }

      const data = await response.json();
      setCalculation(data.calculation);
      setMedicPostcode(data.medicPostcode);
      setCached(data.cached);

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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Calculating travel cost...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error calculating cost</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchCalculation}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!calculation) {
    return null;
  }

  const hours = Math.floor(calculation.travel_time_minutes / 60);
  const minutes = calculation.travel_time_minutes % 60;

  const getBadgeColor = () => {
    if (calculation.recommended_option === 'deny') return 'bg-red-100 text-red-800 border-red-300';
    if (calculation.recommended_option === 'room_board') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getRecommendationText = () => {
    if (calculation.recommended_option === 'deny') return 'Booking should be denied';
    if (calculation.recommended_option === 'room_board') return 'Room & board recommended';
    return 'Travel bonus recommended';
  };

  const costPercentageColor =
    calculation.cost_percentage > 50 ? 'bg-red-500' : calculation.cost_percentage > 30 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Out-of-Territory Cost Analysis</h3>
        {cached && (
          <p className="text-sm text-gray-500 mt-1">
            ✓ Cached result (refreshes every 7 days)
          </p>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Travel Details */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Travel Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Distance</p>
              <p className="font-medium text-gray-900">{calculation.distance_miles} miles</p>
            </div>
            <div>
              <p className="text-gray-500">Travel Time</p>
              <p className="font-medium text-gray-900">
                {hours}h {minutes}m
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Route</p>
              <p className="font-medium text-gray-900">
                {medicPostcode} → {sitePostcode}
              </p>
            </div>
          </div>
        </div>

        {/* Cost Comparison */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Cost Comparison</h4>
          <div className="space-y-3">
            {/* Option 1: Travel Bonus */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">Option 1: Travel Bonus</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Billable miles: {Math.max(0, calculation.distance_miles - 30)} miles
                  </p>
                  <p className="text-sm text-gray-500">Rate: £2/mile</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">£{calculation.travel_cost.toFixed(2)}</p>
              </div>
              {calculation.recommended_option === 'travel_bonus' && (
                <div className="mt-2 px-2 py-1 bg-green-50 text-green-700 text-xs rounded inline-block">
                  Recommended
                </div>
              )}
            </div>

            {/* Option 2: Room & Board */}
            {calculation.room_board_cost > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">Option 2: Room & Board</p>
                    <p className="text-sm text-gray-500 mt-1">Overnight accommodation</p>
                    <p className="text-sm text-gray-500">Flat rate</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">£{calculation.room_board_cost.toFixed(2)}</p>
                </div>
                {calculation.recommended_option === 'room_board' && (
                  <div className="mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded inline-block">
                    Recommended
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recommendation Badge */}
        <div>
          <div className={`border rounded-lg px-4 py-3 ${getBadgeColor()}`}>
            <p className="font-semibold text-center">{getRecommendationText()}</p>
          </div>
        </div>

        {/* Cost Analysis */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Cost Analysis</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total cost:</span>
              <span className="font-medium text-gray-900">£{calculation.total_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shift value:</span>
              <span className="font-medium text-gray-900">£{calculation.shift_value.toFixed(2)}</span>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Cost percentage:</span>
                <span className="font-medium text-gray-900">{calculation.cost_percentage.toFixed(1)}%</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${costPercentageColor} h-2 rounded-full transition-all`}
                  style={{ width: `${Math.min(calculation.cost_percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Warning for high cost */}
        {calculation.recommended_option === 'deny' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-medium text-red-900">⚠️ High Cost Warning</p>
            <p className="text-red-700 text-sm mt-1">
              This booking exceeds the 50% cost threshold and should be denied. Admin override required.
            </p>
          </div>
        )}

        {/* Recalculate button */}
        <div className="pt-3 border-t">
          <button
            onClick={fetchCalculation}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm font-medium"
          >
            Recalculate
          </button>
        </div>
      </div>
    </div>
  );
}
