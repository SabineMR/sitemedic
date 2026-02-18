'use client';

import { useState, useEffect } from 'react';
import { TravelCalculation } from '@/lib/bookings/out-of-territory';
import { createClient } from '@/lib/supabase/client';

interface OutOfTerritoryApprovalProps {
  bookingId: string;
}

interface Booking {
  id: string;
  site_name: string;
  shift_date: string;
  shift_hours: number;
  total: number;
  status: string;
  medic_id: string;
  site_postcode: string;
  base_rate: number;
}

const ADMIN_OVERRIDE_LIMIT = 75; // 75% hard limit

export function OutOfTerritoryApproval({ bookingId }: OutOfTerritoryApprovalProps) {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [calculation, setCalculation] = useState<TravelCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchBookingData();
  }, [bookingId]);

  const fetchBookingData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      setBooking(bookingData);

      // Calculate out-of-territory cost
      const response = await fetch('/api/bookings/calculate-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicId: bookingData.medic_id,
          sitePostcode: bookingData.site_postcode,
          shiftHours: bookingData.shift_hours,
          baseRate: bookingData.base_rate,
        }),
      });

      if (!response.ok) throw new Error('Failed to calculate cost');

      const data = await response.json();
      setCalculation(data.calculation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!calculation || !booking) return;

    // Check if override confirmation needed
    if (calculation.cost_percentage > 50 && !showOverrideConfirm) {
      setShowOverrideConfirm(true);
      return;
    }

    // Block if cost >75% (hard limit)
    if (calculation.cost_percentage > ADMIN_OVERRIDE_LIMIT) {
      alert(`Cannot approve: Cost (${calculation.cost_percentage.toFixed(1)}%) exceeds admin override limit (${ADMIN_OVERRIDE_LIMIT}%). Escalation required.`);
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Update booking
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          requires_manual_approval: false,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          out_of_territory_cost: calculation.total_cost,
          out_of_territory_type: calculation.recommended_option,
          admin_notes: notes || null,
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      alert('Booking approved successfully!');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve booking');
    } finally {
      setSubmitting(false);
      setShowOverrideConfirm(false);
    }
  };

  const handleDeny = async () => {
    if (!booking || !denialReason.trim()) {
      alert('Please provide a reason for denial');
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny booking');
    } finally {
      setSubmitting(false);
      setShowDenyModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading booking details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error loading booking</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!booking || !calculation) {
    return null;
  }

  const hours = Math.floor(calculation.travel_time_minutes / 60);
  const minutes = calculation.travel_time_minutes % 60;

  const getBadgeColor = () => {
    if (calculation.recommended_option === 'deny') return 'bg-red-100 text-red-800';
    if (calculation.recommended_option === 'room_board') return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Booking Details */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Site Name</p>
            <p className="font-medium text-gray-900">{booking.site_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Shift Date</p>
            <p className="font-medium text-gray-900">{new Date(booking.shift_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Shift Hours</p>
            <p className="font-medium text-gray-900">{booking.shift_hours}h</p>
          </div>
          <div>
            <p className="text-gray-500">Total Amount</p>
            <p className="font-medium text-gray-900">£{booking.total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Out-of-Territory Calculation */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Out-of-Territory Analysis</h3>

        <div className="space-y-4">
          {/* Travel Details */}
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
          </div>

          {/* Cost Breakdown */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Cost Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Travel Bonus (£2/mile beyond 30 miles):</span>
                <span className="font-medium">£{calculation.travel_cost.toFixed(2)}</span>
              </div>
              {calculation.room_board_cost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Room & Board (overnight):</span>
                  <span className="font-medium">£{calculation.room_board_cost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                <span>Total Out-of-Territory Cost:</span>
                <span>£{calculation.total_cost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className={`rounded-lg px-4 py-3 ${getBadgeColor()}`}>
            <p className="font-semibold text-center">
              {calculation.recommended_option === 'deny' && 'DENY BOOKING'}
              {calculation.recommended_option === 'room_board' && 'ROOM & BOARD RECOMMENDED'}
              {calculation.recommended_option === 'travel_bonus' && 'TRAVEL BONUS RECOMMENDED'}
            </p>
          </div>

          {/* Cost Percentage */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Cost as % of shift value:</span>
              <span className="font-medium text-gray-900">{calculation.cost_percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  calculation.cost_percentage > 50 ? 'bg-red-500' : calculation.cost_percentage > 30 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(calculation.cost_percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this approval decision..."
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={submitting || calculation.cost_percentage > ADMIN_OVERRIDE_LIMIT}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition ${
              calculation.cost_percentage > ADMIN_OVERRIDE_LIMIT
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {calculation.cost_percentage > 50 ? 'Override & Approve' : 'Approve Booking'}
          </button>
          <button
            onClick={() => setShowDenyModal(true)}
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            Deny Booking
          </button>
        </div>

        {calculation.cost_percentage > ADMIN_OVERRIDE_LIMIT && (
          <p className="text-red-600 text-sm mt-3 text-center">
            ⚠️ Cost exceeds {ADMIN_OVERRIDE_LIMIT}% - escalation required
          </p>
        )}
      </div>

      {/* Override Confirmation Modal */}
      {showOverrideConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Override Denial Recommendation?</h3>
            <p className="text-gray-700 mb-4">
              This booking has a cost percentage of {calculation.cost_percentage.toFixed(1)}%, which exceeds the 50%
              threshold. Are you sure you want to override and approve?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowOverrideConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deny Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Deny Booking</h3>
            <p className="text-gray-700 mb-4">Please provide a reason for denying this booking:</p>
            <textarea
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Reason for denial..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDenyModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeny}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
