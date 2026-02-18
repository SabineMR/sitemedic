'use client';

/**
 * CompensationSettings
 *
 * Admin UI card for managing a medic's pay model, classification,
 * years of experience, and hourly rate.
 *
 * Pay models:
 *   Hourly (new)     — admin sets exact £/hr; medic_pay = rate × hours_worked
 *   Percentage (legacy) — junior/senior/lead tier % of booking total
 *
 * Classification: UK medical classification for categorisation/reporting.
 * Hourly rate: manually set per medic — no auto-calculation.
 * Mileage: HMRC 45p/mile, unchanged, always on top.
 */

import { useState } from 'react';
import { TrendingUp, Car, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import {
  EXPERIENCE_TIER_LIST,
  HMRC_MILEAGE_RATE_PENCE,
  ExperienceLevel,
  calculateTotalMedicPayout,
  MedicClassification,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_LIST,
} from '@/lib/medics/experience';

type PayModel = 'hourly' | 'percentage';

interface CompensationSettingsProps {
  medicId: string;
  initialLevel: ExperienceLevel;
  medicName: string;
  initialPayModel?: PayModel;
  initialClassification?: MedicClassification | null;
  initialYearsExperience?: number;
  initialHourlyRate?: number | null;
}

/** Example shift for the preview panels */
const EXAMPLE_HOURS = 8;
const EXAMPLE_BOOKING_TOTAL = 403.20; // 8 hrs × £42 + 20% VAT
const EXAMPLE_ROUND_TRIP_MILES = 24;

export function CompensationSettings({
  medicId,
  initialLevel,
  medicName,
  initialPayModel = 'hourly',
  initialClassification = null,
  initialYearsExperience = 0,
  initialHourlyRate = null,
}: CompensationSettingsProps) {
  const firstName = medicName.split(' ')[0];

  // Pay model toggle
  const [payModel, setPayModel] = useState<PayModel>(initialPayModel);

  // Legacy percentage model state
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>(initialLevel);

  // Hourly model state
  const [classification, setClassification] = useState<MedicClassification | ''>(
    initialClassification ?? ''
  );
  const [yearsExperience, setYearsExperience] = useState<number>(initialYearsExperience);
  const [hourlyRate, setHourlyRate] = useState<string>(
    initialHourlyRate != null ? String(initialHourlyRate) : ''
  );

  // Form state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview calculations
  const selectedTier = EXPERIENCE_TIER_LIST.find(t => t.level === selectedLevel)!;
  const percentagePreview = calculateTotalMedicPayout({
    bookingTotal: EXAMPLE_BOOKING_TOTAL,
    medicPayoutPercent: selectedTier.medicPayoutPercent,
    legMiles: EXAMPLE_ROUND_TRIP_MILES,
    mileageRatePence: HMRC_MILEAGE_RATE_PENCE,
  });

  const parsedHourlyRate = parseFloat(hourlyRate) || 0;
  const hourlyShiftPay = parseFloat((parsedHourlyRate * EXAMPLE_HOURS).toFixed(2));
  const hourlyMileage = parseFloat((EXAMPLE_ROUND_TRIP_MILES * HMRC_MILEAGE_RATE_PENCE / 100).toFixed(2));
  const hourlyTotal = parseFloat((hourlyShiftPay + hourlyMileage).toFixed(2));

  const isDirty =
    payModel !== initialPayModel ||
    selectedLevel !== initialLevel ||
    classification !== (initialClassification ?? '') ||
    yearsExperience !== initialYearsExperience ||
    parseFloat(hourlyRate || '0') !== (initialHourlyRate ?? 0);

  async function handleSave() {
    if (!isDirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const body: Record<string, unknown> = {
        pay_model: payModel,
        experience_level: selectedLevel,
        classification: classification || null,
        years_experience: yearsExperience,
        hourly_rate: parsedHourlyRate > 0 ? parsedHourlyRate : null,
      };

      const res = await fetch(`/api/medics/${medicId}/compensation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to update compensation settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Pay model toggle */}
      <div>
        <p className="text-gray-400 text-sm mb-3">
          Choose how {firstName} is paid for each shift.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                value: 'hourly' as PayModel,
                label: 'Hourly (new)',
                description: 'Admin sets exact £/hr · medic_pay = rate × hours',
              },
              {
                value: 'percentage' as PayModel,
                label: 'Percentage (legacy)',
                description: 'Junior 35% / Senior 42% / Lead 50% of booking total',
              },
            ] as const
          ).map(option => {
            const isSelected = payModel === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setPayModel(option.value)}
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
                  {option.label}
                </span>
                <span className="text-gray-500 text-xs leading-tight">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hourly model fields */}
      {payModel === 'hourly' && (
        <div className="space-y-4">
          {/* Classification */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              UK Medical Classification
            </label>
            <select
              value={classification}
              onChange={e => setClassification(e.target.value as MedicClassification | '')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">— Select classification —</option>
              {CLASSIFICATION_LIST.map(c => (
                <option key={c} value={c}>
                  {CLASSIFICATION_LABELS[c]}
                </option>
              ))}
            </select>
            <p className="text-gray-600 text-xs mt-1">
              For categorisation and reporting only — does not affect pay.
            </p>
          </div>

          {/* Years of experience */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              Years of Experience
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                step={1}
                value={yearsExperience}
                onChange={e => setYearsExperience(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-32 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="text-gray-500 text-sm">years</span>
            </div>
          </div>

          {/* Hourly rate */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              Hourly Rate (£/hr)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">£</span>
              <input
                type="number"
                min={0}
                step={0.50}
                placeholder="e.g. 18.00"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
                className="w-40 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="text-gray-500 text-sm">per hour</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">
              Set manually — no auto-calculation. Required before booking on hourly model.
            </p>
          </div>

          {/* Hourly payout preview */}
          {parsedHourlyRate > 0 && (
            <div className="bg-gray-700/20 border border-gray-700/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                  Example {EXAMPLE_HOURS}-hr shift · {EXAMPLE_ROUND_TRIP_MILES} mi round trip
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Shift pay</p>
                  <p className="text-white font-semibold text-lg">£{hourlyShiftPay.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">
                    {EXAMPLE_HOURS}h × £{parsedHourlyRate.toFixed(2)}/hr
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Mileage</p>
                  <p className="text-white font-semibold text-lg">£{hourlyMileage.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">
                    {EXAMPLE_ROUND_TRIP_MILES} mi × {HMRC_MILEAGE_RATE_PENCE}p
                  </p>
                </div>
                <div className="border-l border-gray-700/50 pl-4">
                  <p className="text-gray-500 text-xs mb-0.5">Total to medic</p>
                  <p className="text-green-400 font-bold text-lg">£{hourlyTotal.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">shift + mileage</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legacy percentage model fields */}
      {payModel === 'percentage' && (
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm mb-3">
              Select {firstName}&apos;s experience tier — this sets their payout percentage automatically.
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

          {/* Percentage payout preview */}
          <div className="bg-gray-700/20 border border-gray-700/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                Example 8-hr standard shift · 12 mi each way ({EXAMPLE_ROUND_TRIP_MILES} mi round trip)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Shift payout</p>
                <p className="text-white font-semibold text-lg">£{percentagePreview.shiftPayout.toFixed(2)}</p>
                <p className="text-gray-500 text-xs">
                  {selectedTier.medicPayoutPercent}% of £{EXAMPLE_BOOKING_TOTAL.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Mileage</p>
                <p className="text-white font-semibold text-lg">£{percentagePreview.mileageReimbursement.toFixed(2)}</p>
                <p className="text-gray-500 text-xs">
                  {EXAMPLE_ROUND_TRIP_MILES} mi × {HMRC_MILEAGE_RATE_PENCE}p (round trip)
                </p>
              </div>
              <div className="border-l border-gray-700/50 pl-4">
                <p className="text-gray-500 text-xs mb-0.5">Total to medic</p>
                <p className="text-green-400 font-bold text-lg">£{percentagePreview.totalPayout.toFixed(2)}</p>
                <p className="text-gray-500 text-xs">shift + mileage</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mileage info (always shown) */}
      <div className="flex items-start gap-3 px-4 py-3 bg-gray-700/20 border border-gray-700/40 rounded-xl">
        <Car className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-gray-400 leading-relaxed">
          <span className="text-gray-200 font-medium">Mileage: {HMRC_MILEAGE_RATE_PENCE}p/mile (HMRC rate)</span>
          {' '}— Auto-calculated from medic home postcode to job site on every shift.
          Added on top of shift pay — not deducted from the platform fee.
        </div>
      </div>

      {/* Save button + status */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all duration-150 shadow-lg shadow-blue-900/20"
        >
          {saving ? 'Saving…' : 'Save settings'}
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
