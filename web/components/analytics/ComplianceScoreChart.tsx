/**
 * ComplianceScoreChart - Org-level compliance score trend
 *
 * Line chart showing weekly compliance scores over the last 12 months.
 * Includes amber (70) and red (40) threshold reference lines matching the
 * compliance score formula tiers used in the compliance_score_history writer.
 *
 * Data is fetched internally via useComplianceHistory hook (RLS-scoped to org).
 */

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useComplianceHistory } from '@/lib/queries/analytics/compliance-history';

export function ComplianceScoreChart() {
  const { data: points, isLoading } = useComplianceHistory();

  if (isLoading) {
    return <div className="h-[350px] bg-gray-800 animate-pulse rounded-lg" />;
  }

  if (!points || points.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-400 text-sm">
        No compliance history yet. Scores are recorded automatically each week.
      </div>
    );
  }

  const mappedData = points.map((p) => ({
    ...p,
    label: new Date(p.period_end).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={mappedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="label"
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
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
          formatter={(value: number | undefined) => [`${value ?? ''}`, 'Score']}
          labelStyle={{ color: '#D1D5DB' }}
        />
        {/* Amber threshold */}
        <ReferenceLine
          y={70}
          stroke="#F59E0B"
          strokeDasharray="4 4"
          label={{ value: 'Amber', position: 'insideRight', fill: '#F59E0B', fontSize: 11 }}
        />
        {/* Red threshold */}
        <ReferenceLine
          y={40}
          stroke="#EF4444"
          strokeDasharray="4 4"
          label={{ value: 'Red', position: 'insideRight', fill: '#EF4444', fontSize: 11 }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3B82F6' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
