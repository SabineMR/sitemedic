/**
 * Revenue Charts - Recharts Visualizations
 *
 * Three chart components for revenue dashboard:
 * 1. RevenueTrendChart - Line chart showing revenue/payouts/fees over time
 * 2. TerritoryRevenueChart - Bar chart ranking territories by revenue
 * 3. MedicEarningsChart - Table showing top earning medics
 */

'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import CurrencyWithTooltip from '@/components/CurrencyWithTooltip';
import type { WeeklyRevenue, TerritoryRevenue, MedicRevenue } from '@/lib/queries/admin/revenue';

// =============================================================================
// REVENUE TREND CHART (Line Chart)
// =============================================================================

interface RevenueTrendChartProps {
  data: WeeklyRevenue[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        No revenue data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="week"
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F3F4F6',
          }}
          formatter={(value: any) => [`£${(value || 0).toLocaleString()}`, '']}
          labelStyle={{ color: '#D1D5DB' }}
        />
        <Legend
          wrapperStyle={{ color: '#D1D5DB' }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="payouts"
          name="Payouts"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="platformFees"
          name="Platform Fees"
          stroke="#2563EB"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// =============================================================================
// TERRITORY REVENUE CHART (Bar Chart)
// =============================================================================

interface TerritoryRevenueChartProps {
  data: TerritoryRevenue[];
}

export function TerritoryRevenueChart({ data }: TerritoryRevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-400">
        No territory data for this period
      </div>
    );
  }

  // Limit to top 10 territories for readability
  const topTerritories = data.slice(0, 10);

  return (
    <div className={topTerritories.length > 10 ? 'overflow-x-auto' : ''}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={topTerritories} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="postcode_sector"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            formatter={((value: any, name: string) => {
              const val = value || 0;
              if (name === 'platformFees') return [`£${val.toLocaleString()}`, 'Platform Fees'];
              if (name === 'medicPayouts') return [`£${val.toLocaleString()}`, 'Medic Payouts'];
              return [`£${val.toLocaleString()}`, name];
            }) as any}
            labelFormatter={(label) => `Territory: ${label}`}
          />
          <Legend
            wrapperStyle={{ color: '#D1D5DB' }}
          />
          <Bar
            dataKey="platformFees"
            name="Platform Fees"
            fill="#2563EB"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey={(item) => item.revenue - item.platformFees}
            name="Medic Payouts"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// MEDIC EARNINGS CHART (Table)
// =============================================================================

interface MedicEarningsChartProps {
  data: MedicRevenue[];
}

export function MedicEarningsChart({ data }: MedicEarningsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-400">
        No completed shifts in this period
      </div>
    );
  }

  // Show top 10 medics
  const topMedics = data.slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Rank</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Medic</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Shifts</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Total Earnings</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Avg/Shift</th>
          </tr>
        </thead>
        <tbody>
          {topMedics.map((medic, index) => {
            const rank = index + 1;
            let borderColor = '';

            // Highlight top 3
            if (rank === 1) borderColor = 'border-l-4 border-yellow-500'; // Gold
            else if (rank === 2) borderColor = 'border-l-4 border-gray-400'; // Silver
            else if (rank === 3) borderColor = 'border-l-4 border-amber-700'; // Bronze

            return (
              <tr
                key={medic.medic_id}
                className={`border-b border-gray-800 hover:bg-gray-800/50 ${borderColor}`}
              >
                <td className="px-4 py-3 text-sm text-gray-300">
                  {rank === 1 && '🥇 '}
                  {rank === 2 && '🥈 '}
                  {rank === 3 && '🥉 '}
                  {rank}
                </td>
                <td className="px-4 py-3 text-sm text-white font-medium">
                  {medic.medic_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300 text-right">
                  {medic.shiftsCompleted}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <CurrencyWithTooltip amount={medic.totalEarnings} className="text-green-400 font-semibold" />
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <CurrencyWithTooltip amount={medic.avgPerShift} className="text-gray-300" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
