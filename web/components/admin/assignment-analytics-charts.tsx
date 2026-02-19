/**
 * Assignment Analytics Charts - Recharts Visualizations
 *
 * Two chart components for the auto-assignment analytics dashboard:
 * 1. AssignmentSuccessChart - Line chart showing success rate and attempt volume over time
 * 2. FailureBreakdownChart - Bar chart showing top failure reasons aggregated across all weeks
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
import type { WeeklyAssignmentStats } from '@/lib/queries/admin/analytics';

// =============================================================================
// ASSIGNMENT SUCCESS CHART (Line Chart)
// =============================================================================

interface AssignmentSuccessChartProps {
  data: WeeklyAssignmentStats[];
}

export function AssignmentSuccessChart({ data }: AssignmentSuccessChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400 text-center px-8">
        No auto-assignment data recorded yet. Data will appear after the auto-assignment system
        processes bookings.
      </div>
    );
  }

  // Summary card calculations
  const totalAttempts = data.reduce((sum, w) => sum + w.total_attempts, 0);
  const avgSuccessRate =
    data.length > 0
      ? Math.round(data.reduce((sum, w) => sum + w.success_rate, 0) / data.length)
      : 0;
  const avgConfidence =
    data.length > 0
      ? Math.round(data.reduce((sum, w) => sum + w.avg_confidence, 0) / data.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{avgSuccessRate}%</div>
          <div className="text-sm text-gray-400 mt-1">Avg Success Rate</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{totalAttempts.toLocaleString()}</div>
          <div className="text-sm text-gray-400 mt-1">Total Attempts</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{avgConfidence}%</div>
          <div className="text-sm text-gray-400 mt-1">Avg Confidence</div>
        </div>
      </div>

      {/* Line Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="week_label"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          {/* Left Y-axis: success rate 0–100% */}
          <YAxis
            yAxisId="rate"
            orientation="left"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          {/* Right Y-axis: attempt counts */}
          <YAxis
            yAxisId="count"
            orientation="right"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            labelStyle={{ color: '#D1D5DB' }}
            formatter={((value: any, name: string) => {
              if (name === 'Success Rate') return [`${value ?? 0}%`, name];
              return [(value ?? 0).toLocaleString(), name];
            }) as any}
          />
          <Legend wrapperStyle={{ color: '#D1D5DB' }} iconType="line" />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="success_rate"
            name="Success Rate"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="total_attempts"
            name="Total Attempts"
            stroke="#2563EB"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// =============================================================================
// FAILURE BREAKDOWN CHART (Bar Chart)
// =============================================================================

interface FailureBreakdownChartProps {
  data: WeeklyAssignmentStats[];
}

interface FailureReasonCount {
  reason: string;
  count: number;
}

export function FailureBreakdownChart({ data }: FailureBreakdownChartProps) {
  // Aggregate top_failure_reason occurrences across all weeks
  const reasonCounts = new Map<string, number>();
  for (const week of data) {
    if (week.top_failure_reason) {
      reasonCounts.set(
        week.top_failure_reason,
        (reasonCounts.get(week.top_failure_reason) || 0) + 1
      );
    }
  }

  const chartData: FailureReasonCount[] = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400 text-center px-8">
        No assignment failures recorded -- excellent auto-assignment performance!
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="reason"
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          tick={{ fill: '#9CA3AF' }}
        />
        <YAxis
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F3F4F6',
          }}
          labelStyle={{ color: '#D1D5DB' }}
          formatter={((value: any) => [value ?? 0, 'Weeks as Top Failure']) as any}
        />
        <Bar dataKey="count" name="Occurrences" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill="#ef4444" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
