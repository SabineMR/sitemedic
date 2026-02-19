/**
 * Medic Utilisation Charts - Analytics Dashboard Components
 *
 * Three components for the medic utilisation analytics section:
 * 1. MedicUtilisationTable - sortable table with utilisation %, progress bars, status
 * 2. OOTBookingsChart - summary cards + bar chart for out-of-territory bookings
 * 3. LateArrivalHeatmap - CSS grid heatmap of late arrivals by medic + day-of-week
 */

'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type {
  MedicUtilisation,
  OOTSummary,
  LateArrivalSummary,
} from '@/lib/queries/admin/analytics';

// =============================================================================
// MEDIC UTILISATION TABLE
// =============================================================================

type SortField = 'utilisation_pct' | 'medic_name' | 'total_shifts_completed';
type SortDir = 'asc' | 'desc';

interface MedicUtilisationTableProps {
  data: MedicUtilisation[];
}

function getUtilColour(pct: number): string {
  if (pct < 50) return 'bg-green-500';
  if (pct <= 80) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getUtilTextColour(pct: number): string {
  if (pct < 50) return 'text-green-400';
  if (pct <= 80) return 'text-yellow-400';
  return 'text-red-400';
}

export function MedicUtilisationTable({ data }: MedicUtilisationTableProps) {
  const [sortField, setSortField] = useState<SortField>('utilisation_pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
        No medic data available
      </div>
    );
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'medic_name') {
      cmp = a.medic_name.localeCompare(b.medic_name);
    } else if (sortField === 'utilisation_pct') {
      cmp = a.utilisation_pct - b.utilisation_pct;
    } else {
      cmp = a.total_shifts_completed - b.total_shifts_completed;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIndicator({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-gray-600">↕</span>;
    return <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-900 border-b border-gray-700">
            <th
              className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white select-none"
              onClick={() => handleSort('medic_name')}
            >
              Medic Name <SortIndicator field="medic_name" />
            </th>
            <th
              className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white select-none"
              onClick={() => handleSort('utilisation_pct')}
            >
              Utilisation % <SortIndicator field="utilisation_pct" />
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
              Booked Days
            </th>
            <th
              className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:text-white select-none"
              onClick={() => handleSort('total_shifts_completed')}
            >
              Total Shifts <SortIndicator field="total_shifts_completed" />
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
              Territories
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr
              key={m.medic_id}
              className="border-b border-gray-800 hover:bg-gray-700/50 bg-gray-800"
            >
              <td className="px-4 py-3 text-sm text-white font-medium">
                {m.medic_name}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-700 rounded-full h-2 min-w-[80px]">
                    <div
                      className={`h-2 rounded-full ${getUtilColour(m.utilisation_pct)}`}
                      style={{ width: `${m.utilisation_pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold w-10 text-right ${getUtilTextColour(m.utilisation_pct)}`}>
                    {m.utilisation_pct}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-300">
                {m.booked_days}/{m.available_days}
              </td>
              <td className="px-4 py-3 text-sm text-gray-300">
                {m.total_shifts_completed}
              </td>
              <td className="px-4 py-3 text-sm text-gray-300">
                {m.territory_count}
              </td>
              <td className="px-4 py-3 text-sm">
                {m.is_available ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-400 border border-green-800">
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-400 border border-red-800">
                    Unavailable
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// OOT BOOKINGS CHART
// =============================================================================

interface OOTBookingsChartProps {
  data: OOTSummary;
}

function formatOOTType(type: 'travel_bonus' | 'room_board' | null): string {
  if (type === 'travel_bonus') return 'Travel Bonus';
  if (type === 'room_board') return 'Room & Board';
  return 'N/A';
}

interface OOTTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      medic_id: string;
      site_postcode: string;
      shift_date: string;
      out_of_territory_cost: number;
      out_of_territory_type: 'travel_bonus' | 'room_board' | null;
    };
  }>;
}

function OOTTooltip({ active, payload }: OOTTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: '#1F2937',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '10px 14px',
        color: '#F3F4F6',
        fontSize: '12px',
      }}
    >
      <p className="font-semibold text-white mb-1">{d.medic_id}</p>
      <p className="text-gray-300">Postcode: {d.site_postcode}</p>
      <p className="text-gray-300">Date: {d.shift_date}</p>
      <p className="text-orange-400 font-semibold">
        Cost: £{(d.out_of_territory_cost || 0).toLocaleString()}
      </p>
      <p className="text-gray-300">Type: {formatOOTType(d.out_of_territory_type)}</p>
    </div>
  );
}

export function OOTBookingsChart({ data }: OOTBookingsChartProps) {
  const { total_oot_bookings, total_extra_cost, oot_percentage, bookings } = data;

  if (total_oot_bookings === 0) {
    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">OOT Bookings</p>
            <p className="text-2xl font-bold text-white">0</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Extra Cost</p>
            <p className="text-2xl font-bold text-white">£0</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">OOT %</p>
            <p className="text-2xl font-bold text-white">0%</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
          No out-of-territory bookings recorded. All bookings within assigned territories.
        </div>
      </div>
    );
  }

  // Top 10 by cost descending
  const top10 = [...bookings]
    .sort((a, b) => b.out_of_territory_cost - a.out_of_territory_cost)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">OOT Bookings</p>
          <p className="text-2xl font-bold text-white">{total_oot_bookings}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Extra Cost</p>
          <p className="text-2xl font-bold text-orange-400">
            £{total_extra_cost.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">OOT %</p>
          <p className="text-2xl font-bold text-yellow-400">{oot_percentage}%</p>
        </div>
      </div>

      {/* Bar chart — top 10 OOT bookings by cost */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={top10}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            tickFormatter={(v) => `£${v.toLocaleString()}`}
          />
          <YAxis
            type="category"
            dataKey="medic_id"
            stroke="#9CA3AF"
            style={{ fontSize: '11px' }}
            width={110}
          />
          <Tooltip content={<OOTTooltip />} />
          <Bar
            dataKey="out_of_territory_cost"
            name="OOT Cost"
            fill="#f97316"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// LATE ARRIVAL HEATMAP
// =============================================================================

interface LateArrivalHeatmapProps {
  data: LateArrivalSummary;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
// day_of_week values for Mon–Fri (0=Sun, 1=Mon … 5=Fri)
const WEEKDAY_INDICES: Record<typeof WEEKDAYS[number], number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
};

function heatmapCellClass(count: number): string {
  if (count === 0) return 'bg-gray-800';
  if (count <= 2) return 'bg-yellow-500/20 border border-yellow-700/40';
  if (count <= 5) return 'bg-orange-500/30 border border-orange-700/40';
  return 'bg-red-500/40 border border-red-700/40';
}

function heatmapTextClass(count: number): string {
  if (count === 0) return 'text-gray-600';
  if (count <= 2) return 'text-yellow-300';
  if (count <= 5) return 'text-orange-300';
  return 'text-red-300';
}

export function LateArrivalHeatmap({ data }: LateArrivalHeatmapProps) {
  const { patterns, total_late_arrivals, worst_day, worst_medic } = data;

  if (total_late_arrivals === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
        No late arrival alerts recorded. All medics arriving on time.
      </div>
    );
  }

  // Collect unique medics in stable order (by total late count desc)
  const medicTotals = new Map<string, { name: string; total: number }>();
  patterns.forEach((p) => {
    const existing = medicTotals.get(p.medic_id);
    if (existing) {
      existing.total += p.late_count;
    } else {
      medicTotals.set(p.medic_id, { name: p.medic_name, total: p.late_count });
    }
  });

  const sortedMedics = Array.from(medicTotals.entries()).sort(
    ([, a], [, b]) => b.total - a.total
  );

  // Build lookup: medicId -> dayIndex -> count
  const lookup = new Map<string, Map<number, number>>();
  patterns.forEach((p) => {
    if (!lookup.has(p.medic_id)) {
      lookup.set(p.medic_id, new Map());
    }
    lookup.get(p.medic_id)!.set(p.day_of_week, p.late_count);
  });

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-gray-400">Total Late Arrivals: </span>
          <span className="text-white font-semibold">{total_late_arrivals}</span>
        </div>
        <div>
          <span className="text-gray-400">Worst Day: </span>
          <span className="text-orange-400 font-semibold">{worst_day}</span>
        </div>
        <div>
          <span className="text-gray-400">Worst Medic: </span>
          <span className="text-orange-400 font-semibold">{worst_medic}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-gray-800 border border-gray-700 inline-block" />
          0
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-700/40 inline-block" />
          1–2
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-orange-500/30 border border-orange-700/40 inline-block" />
          3–5
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-red-500/40 border border-red-700/40 inline-block" />
          6+
        </span>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* Header row */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '160px repeat(5, 1fr)' }}>
            <div /> {/* empty corner */}
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {sortedMedics.map(([medicId, { name }]) => {
            const medicMap = lookup.get(medicId);
            return (
              <div
                key={medicId}
                className="grid gap-1 mb-1"
                style={{ gridTemplateColumns: '160px repeat(5, 1fr)' }}
              >
                {/* Medic name */}
                <div className="flex items-center pr-2">
                  <span
                    className="text-xs text-gray-300 truncate"
                    title={name}
                  >
                    {name}
                  </span>
                </div>

                {/* Day cells */}
                {WEEKDAYS.map((day) => {
                  const dayIndex = WEEKDAY_INDICES[day];
                  const count = medicMap?.get(dayIndex) ?? 0;
                  return (
                    <div
                      key={day}
                      className={`rounded flex items-center justify-center h-8 text-xs font-semibold ${heatmapCellClass(count)} ${heatmapTextClass(count)}`}
                      title={`${name} — ${day}: ${count} late arrival${count !== 1 ? 's' : ''}`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
