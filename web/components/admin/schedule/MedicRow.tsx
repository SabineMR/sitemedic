/**
 * MedicRow Component
 *
 * One row per medic showing their info and 7 day cells for the week
 *
 * WHY: Each medic row provides a complete view of one medic's weekly schedule.
 * Admins can see at a glance:
 * - Medic name and qualifications (certifications, star rating)
 * - Current workload (hours and utilization percentage)
 * - All shifts for the week (across 7 day cells)
 *
 * The utilization bar helps prevent overloading medics:
 * - Green: < 50% utilized (has capacity)
 * - Yellow: 50-80% utilized (moderate load)
 * - Red: > 80% utilized (near or over capacity)
 */

'use client';

import type { MedicWithStats } from '@/types/schedule';
import { DayCell } from './DayCell';

interface MedicRowProps {
  medic: MedicWithStats;
  dates: string[];
}

export function MedicRow({ medic, dates }: MedicRowProps) {
  // Determine utilization color
  const getUtilizationColor = (percent: number): string => {
    if (percent > 80) return 'bg-red-500';
    if (percent > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
      <div className="grid grid-cols-8 gap-2">
        {/* Medic Info Column (1/8) */}
        <div className="flex flex-col justify-between min-w-[140px]">
          {/* Name */}
          <div>
            <div className="text-white font-medium text-sm">
              {medic.first_name} {medic.last_name}
            </div>

            {/* Certifications & Rating */}
            <div className="text-gray-400 text-xs mt-1 flex items-center gap-1">
              {medic.has_confined_space_cert && (
                <span title="Confined Space Certified">🏗️</span>
              )}
              {medic.has_trauma_cert && (
                <span title="Trauma Specialist Certified">🏥</span>
              )}
              <span className="ml-1">⭐ {medic.star_rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Utilization Stats */}
          <div className="mt-3">
            <div className="text-xs text-gray-500 flex justify-between">
              <span>{medic.weekly_hours}h this week</span>
              <span className="font-medium">{medic.utilization_percent}%</span>
            </div>

            {/* Utilization Bar */}
            <div className="h-2 bg-gray-700 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getUtilizationColor(
                  medic.utilization_percent
                )}`}
                style={{ width: `${Math.min(medic.utilization_percent, 100)}%` }}
              />
            </div>

            {/* Shift Count */}
            <div className="text-xs text-gray-500 mt-1">
              {medic.shifts_this_week} {medic.shifts_this_week === 1 ? 'shift' : 'shifts'}
            </div>
          </div>
        </div>

        {/* Day Cells (7/8) */}
        {dates.map((date) => (
          <DayCell key={date} medicId={medic.id} date={date} />
        ))}
      </div>
    </div>
  );
}
