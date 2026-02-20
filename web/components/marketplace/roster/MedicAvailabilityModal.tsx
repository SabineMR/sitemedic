/**
 * MedicAvailabilityModal Component
 * Phase 37: Company Accounts -- Plan 03
 *
 * Modal for company admin to set medic availability (date-range blocking).
 * Used in the roster management UI and company profile views.
 *
 * FEATURES:
 * - Date range selection for unavailability period
 * - Optional reason text input (e.g., "Training", "Sick leave")
 * - "Clear availability" button to remove unavailability
 * - Pre-populates form when medic already has dates set
 * - PATCH /api/marketplace/roster/[id] to save changes
 * - Success: sonner toast, close modal, invalidate roster query cache
 */

'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarOff, RotateCcw, Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface MedicAvailabilityModalProps {
  medicId: string | null;
  medicName: string;
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  /** Pre-populated unavailability data from existing roster entry */
  currentUnavailableFrom?: string | null;
  currentUnavailableUntil?: string | null;
  currentUnavailableReason?: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function MedicAvailabilityModal({
  medicId,
  medicName,
  isOpen,
  onClose,
  companyId,
  currentUnavailableFrom,
  currentUnavailableUntil,
  currentUnavailableReason,
}: MedicAvailabilityModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [unavailableFrom, setUnavailableFrom] = useState('');
  const [unavailableUntil, setUnavailableUntil] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Pre-populate form when modal opens with existing data
  useEffect(() => {
    if (isOpen) {
      setUnavailableFrom(currentUnavailableFrom ?? '');
      setUnavailableUntil(currentUnavailableUntil ?? '');
      setReason(currentUnavailableReason ?? '');
    }
  }, [isOpen, currentUnavailableFrom, currentUnavailableUntil, currentUnavailableReason]);

  // =========================================================================
  // Submit: Set unavailability
  // =========================================================================
  const handleSubmit = async () => {
    if (!medicId || !unavailableFrom) {
      toast.error('Please select at least a start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/roster/${medicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available: false,
          unavailableFrom,
          unavailableUntil: unavailableUntil || null,
          unavailableReason: reason || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update availability');
      }

      toast.success(`${medicName} marked as unavailable`);
      queryClient.invalidateQueries({ queryKey: ['company-roster', companyId] });
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update availability'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Clear: Remove unavailability
  // =========================================================================
  const handleClear = async () => {
    if (!medicId) return;

    setIsClearing(true);
    try {
      const res = await fetch(`/api/marketplace/roster/${medicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available: true,
          unavailableFrom: null,
          unavailableUntil: null,
          unavailableReason: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to clear availability');
      }

      toast.success(`${medicName} marked as available`);
      queryClient.invalidateQueries({ queryKey: ['company-roster', companyId] });
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to clear availability'
      );
    } finally {
      setIsClearing(false);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-amber-600" />
            Set Availability for {medicName}
          </DialogTitle>
          <DialogDescription>
            Mark this medic as unavailable for a date range. They will not appear
            in the roster picker during this period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Unavailable From */}
          <div>
            <Label htmlFor="unavailableFrom" className="text-sm font-medium">
              Unavailable from
            </Label>
            <Input
              id="unavailableFrom"
              type="date"
              value={unavailableFrom}
              onChange={(e) => setUnavailableFrom(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Unavailable Until */}
          <div>
            <Label htmlFor="unavailableUntil" className="text-sm font-medium">
              Unavailable until
            </Label>
            <Input
              id="unavailableUntil"
              type="date"
              value={unavailableUntil}
              onChange={(e) => setUnavailableUntil(e.target.value)}
              min={unavailableFrom || undefined}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank for indefinite unavailability from the start date.
            </p>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason (optional)
            </Label>
            <Input
              id="reason"
              type="text"
              placeholder="e.g., Training, Sick leave, On assignment elsewhere"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          {/* Clear Availability Button */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={isClearing || isSubmitting}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1.5" />
            )}
            Clear Availability
          </Button>

          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isClearing}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isClearing || !unavailableFrom}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Set Unavailable'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
