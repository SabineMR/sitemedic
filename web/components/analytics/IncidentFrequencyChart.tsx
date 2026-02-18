/**
 * IncidentFrequencyChart - Weekly treatment + near-miss frequency trend
 *
 * Area chart showing weekly counts of treatments and near-misses over the
 * last 12 months. Uses two overlapping areas to surface patterns such as
 * event spikes and near-miss clusters.
 *
 * Data is fetched internally via useIncidentFrequency hook (RLS-scoped to org).
 */

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useIncidentFrequency } from '@/lib/queries/analytics/compliance-history';

export function IncidentFrequencyChart() {
  const { data: points, isLoading } = useIncidentFrequency();

  if (isLoading) {
    return <div className="h-[350px] bg-gray-800 animate-pulse rounded-lg" />;
  }

  if (!points || points.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-400 text-sm">
        No incident data in the last 12 months.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={points} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="week_label"
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          allowDecimals={false}
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
        />
        <Legend wrapperStyle={{ color: '#9CA3AF' }} />
        <Area
          type="monotone"
          dataKey="treatments"
          name="Treatments"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="near_misses"
          name="Near-Misses"
          stroke="#F59E0B"
          fill="#F59E0B"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
