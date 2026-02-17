'use client';

/**
 * CompensationSettings
 *
 * Admin UI card for managing a medic's experience tier and viewing
 * their resulting payout percentage + mileage reimbursement rate.
 *
 * Experience tiers → payout split:
 *   Junior  → 35% of booking total  |  platform keeps 65%
 *   Senior  → 42% of booking total  |  platform keeps 58%
 *   Lead    → 50% of booking total  |  platform keeps 50%
 *
 * Mileage: HMRC 45p/mile, added on top of shift payout, every shift.
 */

import { useState } from 'react';
import { TrendingUp, Car, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  EXPERIENCE_TIER_LIST,
  HMRC_MILEAGE_RATE_PENCE,
  ExperienceLevel,
  calculateTotalMedicPayout,
} from '@/lib/medics/experience';

interface CompensationSettingsProps {
  medicId: string;
  initialLevel: ExperienceLevel;
  medicName: string;
}

/** Example shift for the "estimated payout" preview */
const EXAMPLE_BOOKING_TOTAL = 403.20; // 8 hrs × £42 + 20% VAT = £403.20
// Round-trip miles for a single-site day example (12 mi each way = 24 mi total)
// The mileage router calculates this automatically per shift; this is just for preview.
const EXAMPLE_ROUND_TRIP_MILES = 24;

export function CompensationSettings({
  medicId,
  initialLevel,
  medicName,
}: CompensationSettingsProps) {
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>(initialLevel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTier = EXPERIENCE_TIER_LIST.find(t => t.level === selectedLevel)!;

  // Live preview: single-site day, 12 mi each way (24 mi round trip)
  const preview = calculateTotalMedicPayout({
    bookingTotal: EXAMPLE_BOOKING_TOTAL,
    medicPayoutPercent: selectedTier.medicPayoutPercent,
    legMiles: EXAMPLE_ROUND_TRIP_MILES,
    mileageRatePence: HMRC_MILEAGE_RATE_PENCE,
  });

  async function handleSave() {
    if (selectedLevel === initialLevel) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/medics/${medicId}/compensation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experience_level: selectedLevel }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to update compensation tier');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const isDirty = selectedLevel !== initialLevel;

  return (
    <div className="space-y-6">
      {/* Experience tier selector */}
      <div>
        <p className="text-gray-400 text-sm mb-3">
          Select {medicName.split(' ')[0]}&apos;s experience tier — this sets their payout
          percentage automatically.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {EXPERIENCE_TIER_LIST.map(tier => {
            const isSelected = selectedLevel === tier.level;
            return (
              <button
                key={tier.level}
                onClick={() => setSelectedLevel(tier.level)}
                className={`relative flex flex-col items-start gap-1 px-4 py-4 rounded-xl border text-left transition-all duration-150 ${
                  isSelected
                    ? 'bg-blue-900/40 border-blue-500/60 shadow-lg shadow-blue-900/20'
                    : 'bg-gray-700/30 border-gray-700/40 hover:border-gray-500/60 hover:bg-gray-700/50'
                }`}
              >
                {isSelected && (
                  <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-blue-400" />
                )}
                <span className={`text-sm font-semibold ${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>
                  {tier.label}
                </span>
                <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                  {tier.medicPayoutPercent}%
                </span>
                <span className="text-gray-500 text-xs leading-tight">{tier.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payout preview */}
      <div className="bg-gray-700/20 border border-gray-700/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
            Example 8-hr Standard Shift · 12 mi each way ({EXAMPLE_ROUND_TRIP_MILES} mi round trip)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Shift payout</p>
            <p className="text-white font-semibold text-lg">£{preview.shiftPayout.toFixed(2)}</p>
            <p className="text-gray-500 text-xs">{selectedTier.medicPayoutPercent}% of £{EXAMPLE_BOOKING_TOTAL.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Mileage</p>
            <p className="text-white font-semibold text-lg">£{preview.mileageReimbursement.toFixed(2)}</p>
            <p className="text-gray-500 text-xs">{EXAMPLE_ROUND_TRIP_MILES} mi × {HMRC_MILEAGE_RATE_PENCE}p (round trip)</p>
          </div>
          <div className="border-l border-gray-700/50 pl-4">
            <p className="text-gray-500 text-xs mb-0.5">Total to medic</p>
            <p className="text-green-400 font-bold text-lg">£{preview.totalPayout.toFixed(2)}</p>
            <p className="text-gray-500 text-xs">shift + mileage</p>
          </div>
        </div>
      </div>

      {/* Mileage info */}
      <div className="flex items-start gap-3 px-4 py-3 bg-gray-700/20 border border-gray-700/40 rounded-xl">
        <Car className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-gray-400 leading-relaxed">
          <span className="text-gray-200 font-medium">Mileage: {HMRC_MILEAGE_RATE_PENCE}p/mile (HMRC rate)</span>
          {' '}— Auto-calculated from medic home postcode to job site on every shift.
          Added on top of shift payout — not deducted from the platform fee.
        </div>
      </div>

      {/* Save button + status */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all duration-150 shadow-lg shadow-blue-900/20"
        >
          {saving ? 'Saving…' : 'Save tier'}
        </button>

        {saved && (
          <span className="flex items-center gap-1.5 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </span>
        )}
        {!isDirty && !saved && (
          <span className="text-gray-500 text-sm">No changes</span>
        )}
      </div>
    </div>
  );
}
