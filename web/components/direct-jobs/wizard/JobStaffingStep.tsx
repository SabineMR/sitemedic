'use client';

/**
 * Step 4: Staffing & Equipment
 * Phase 34.1: Self-Procured Jobs — Plan 02
 *
 * Collects staffing requirements and equipment needed.
 * No budget_min/max fields — direct jobs use agreed_price in the Pricing step.
 * Mirrors StaffingEquipmentStep.tsx from the marketplace event wizard.
 */

import { useDirectJobStore } from '@/stores/useDirectJobStore';
import { STAFFING_ROLE_LABELS, EQUIPMENT_TYPE_LABELS } from '@/lib/marketplace/event-types';
import type { StaffingRole, EquipmentItem } from '@/lib/marketplace/event-types';

interface Props {
  errors?: Record<string, string[] | undefined>;
}

export default function JobStaffingStep({ errors }: Props) {
  const store = useDirectJobStore();

  return (
    <div className="space-y-8">
      {/* Staffing Requirements */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Staffing Requirements <span className="text-red-500">*</span>
        </h3>
        <div className="space-y-3">
          {store.staffing_requirements.map((req, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Role</label>
                <select
                  value={req.role}
                  onChange={(e) => store.updateStaffingRequirement(index, 'role', e.target.value as StaffingRole)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select role...</option>
                  {Object.entries(STAFFING_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                <input
                  type="number"
                  value={req.quantity}
                  onChange={(e) => store.updateStaffingRequirement(index, 'quantity', parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Day Assignment</label>
                <select
                  value={req.event_day_id || ''}
                  onChange={(e) => store.updateStaffingRequirement(index, 'event_day_id', e.target.value || null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All days</option>
                  {store.event_days.map((day, dayIndex) => (
                    <option key={dayIndex} value={`day-${dayIndex}`}>
                      {day.event_date ? new Date(day.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : `Day ${dayIndex + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input
                  type="text"
                  value={req.additional_notes}
                  onChange={(e) => store.updateStaffingRequirement(index, 'additional_notes', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
              {store.staffing_requirements.length > 1 && (
                <button
                  type="button"
                  onClick={() => store.removeStaffingRequirement(index)}
                  className="mt-5 text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {errors?.staffing_requirements && (
            <p className="text-sm text-red-600">{errors.staffing_requirements[0]}</p>
          )}
        </div>
        <button
          type="button"
          onClick={store.addStaffingRequirement}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add another role
        </button>
      </div>

      {/* Equipment Checklist */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Equipment Required</h3>
        <div className="space-y-2">
          {(Object.entries(EQUIPMENT_TYPE_LABELS) as [EquipmentItem['type'], string][]).map(([type, label]) => {
            const checked = store.equipment_required.some((e) => e.type === type);
            const item = store.equipment_required.find((e) => e.type === type);
            return (
              <div key={type}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => store.toggleEquipment(type)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{label}</span>
                </label>
                {checked && (
                  <input
                    type="text"
                    value={item?.notes || ''}
                    onChange={(e) => store.updateEquipmentNotes(type, e.target.value)}
                    className="mt-1 ml-6 w-full max-w-md rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    placeholder="Additional notes (optional)"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
