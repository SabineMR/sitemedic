'use client';

/**
 * Shift Configuration Component
 * Phase 4.5 + multi-vertical update: Shift times, vertical-aware special
 * requirements, and recurring booking.
 */

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookingFormData } from '@/lib/booking/types';
import {
  VERTICAL_LABELS,
  VERTICAL_REQUIREMENTS,
  requirementsToBooleans,
  type BookingVerticalId,
} from '@/lib/booking/vertical-requirements';

interface ShiftConfigProps {
  formData: BookingFormData;
  onChange: (updates: Partial<BookingFormData>) => void;
}

export function ShiftConfig({ formData, onChange }: ShiftConfigProps) {
  // Generate 30-minute increment times
  const startTimes = [];
  for (let hour = 6; hour <= 12; hour++) {
    startTimes.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 12) {
      startTimes.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Calculate minimum end time (start + 8 hours)
  const calculateMinEndTime = (startTime: string): Date => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    start.setHours(start.getHours() + 8);
    return start;
  };

  // Generate end times based on start time
  const getEndTimes = () => {
    if (!formData.shiftStartTime) return [];

    const minEnd = calculateMinEndTime(formData.shiftStartTime);
    const minEndHour = minEnd.getHours();

    const endTimes = [];
    for (let hour = minEndHour; hour <= 20; hour++) {
      endTimes.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 20) {
        endTimes.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return endTimes;
  };

  // Calculate shift hours
  const calculateShiftHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);
    return (endHours + endMinutes / 60) - (startHours + startMinutes / 60);
  };

  // Update shift hours when start or end time changes
  const handleTimeChange = (updates: Partial<BookingFormData>) => {
    const newStartTime = updates.shiftStartTime || formData.shiftStartTime;
    const newEndTime = updates.shiftEndTime || formData.shiftEndTime;

    if (newStartTime && newEndTime) {
      const hours = calculateShiftHours(newStartTime, newEndTime);
      onChange({ ...updates, shiftHours: hours });
    } else {
      onChange(updates);
    }
  };

  // --- Vertical / requirements logic ---

  const currentVertical = (formData.eventVertical || 'general') as BookingVerticalId;
  const requirements = VERTICAL_REQUIREMENTS[currentVertical] ?? VERTICAL_REQUIREMENTS.general;
  const selected = formData.selectedRequirements ?? [];

  function handleVerticalChange(verticalId: string) {
    const newVertical = verticalId as BookingVerticalId;
    const newReqs = VERTICAL_REQUIREMENTS[newVertical] ?? VERTICAL_REQUIREMENTS.general;

    // Clear all selected requirements when vertical changes; update booleans to false
    const booleanUpdates = requirementsToBooleans([], newReqs);
    onChange({
      eventVertical: verticalId,
      selectedRequirements: [],
      confinedSpaceRequired: false,
      traumaSpecialistRequired: false,
      ...booleanUpdates,
    });
  }

  function toggleRequirement(reqId: string) {
    const next = selected.includes(reqId)
      ? selected.filter((id) => id !== reqId)
      : [...selected, reqId];

    // Sync any requirements that have DB boolean fields
    const booleanUpdates = requirementsToBooleans(next, requirements);
    onChange({ selectedRequirements: next, ...booleanUpdates });
  }

  return (
    <div className="space-y-4">
      {/* Shift Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="shiftStartTime" className="text-sm font-medium">
            Shift Start Time <span className="text-destructive">*</span>
          </label>
          <Select
            value={formData.shiftStartTime}
            onValueChange={(value) => handleTimeChange({ shiftStartTime: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select start time" />
            </SelectTrigger>
            <SelectContent>
              {startTimes.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="shiftEndTime" className="text-sm font-medium">
            Shift End Time <span className="text-destructive">*</span>
          </label>
          <Select
            value={formData.shiftEndTime}
            onValueChange={(value) => handleTimeChange({ shiftEndTime: value })}
            disabled={!formData.shiftStartTime}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select end time" />
            </SelectTrigger>
            <SelectContent>
              {getEndTimes().map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Shift Hours Display */}
      {formData.shiftHours > 0 && (
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm font-medium">
            Shift Duration: {formData.shiftHours} hours
          </p>
        </div>
      )}

      {/* Event / Site Type */}
      <div>
        <label className="text-sm font-medium">
          Event / Site Type <span className="text-destructive">*</span>
        </label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Selecting your event type shows the relevant special requirements below.
        </p>
        <Select
          value={formData.eventVertical || ''}
          onValueChange={handleVerticalChange}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select event or site type…" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(VERTICAL_LABELS) as [BookingVerticalId, string][]).map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Special Requirements */}
      {formData.eventVertical && requirements.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Special Requirements</p>
          <p className="text-xs text-muted-foreground -mt-1">
            Select any that apply. These help us match the right medic profile.
          </p>
          <div className="space-y-2.5">
            {requirements.map((req) => (
              <div key={req.id} className="flex items-start space-x-2">
                <Checkbox
                  id={req.id}
                  checked={selected.includes(req.id)}
                  onCheckedChange={() => toggleRequirement(req.id)}
                  className="mt-0.5"
                />
                <div>
                  <label
                    htmlFor={req.id}
                    className="text-sm leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {req.label}
                  </label>
                  {req.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Notes */}
      <div>
        <label htmlFor="specialNotes" className="text-sm font-medium">
          Additional Notes (optional)
        </label>
        <textarea
          id="specialNotes"
          placeholder="Any site-specific details, access instructions, or unusual requirements not listed above…"
          value={formData.specialNotes}
          onChange={(e) => onChange({ specialNotes: e.target.value })}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
        />
      </div>

      {/* Recurring Booking Section */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isRecurring"
            checked={formData.isRecurring}
            onCheckedChange={(checked) => {
              if (checked === true) {
                onChange({ isRecurring: true });
              } else {
                onChange({
                  isRecurring: false,
                  recurrencePattern: null,
                  recurringWeeks: 0,
                });
              }
            }}
          />
          <label
            htmlFor="isRecurring"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Recurring booking
          </label>
        </div>

        {formData.isRecurring && (
          <div className="ml-6 space-y-3 pt-2">
            <div>
              <label htmlFor="recurrencePattern" className="text-sm font-medium">
                Recurrence Pattern <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.recurrencePattern || undefined}
                onValueChange={(value) =>
                  onChange({ recurrencePattern: value as 'weekly' | 'biweekly' })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="recurringWeeks" className="text-sm font-medium">
                Number of weeks <span className="text-destructive">*</span>
              </label>
              <Input
                id="recurringWeeks"
                type="number"
                min={1}
                max={52}
                value={formData.recurringWeeks || ''}
                onChange={(e) =>
                  onChange({ recurringWeeks: parseInt(e.target.value) || 0 })
                }
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Maximum 52 weeks (1 year)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
