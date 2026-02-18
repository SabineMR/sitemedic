/**
 * AdminComplianceTrend - Platform Admin Aggregate Compliance Chart
 *
 * ComposedChart showing average compliance score across all organisations
 * with a min/max shaded band. Platform admin analytics — ANLT-06.
 *
 * CRITICAL: Uses ComposedChart (NOT LineChart) — Area elements require
 * ComposedChart as container.
 */

'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAdminComplianceTrend } from '@/lib/queries/analytics/compliance-history';

// =============================================================================
// HELPERS
// =============================================================================

function formatPeriodLabel(periodEnd: string): string {
  const date = new Date(periodEnd);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// =============================================================================
// CUSTOM TOOLTIP
// =============================================================================

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function ComplianceTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // Extract values from payload
  const avgItem = payload.find((p) => p.name === 'Avg Score');
  const maxItem = payload.find((p) => p.name === 'Max Score');
  const minItem = payload.find((p) => p.name === 'Min Score');

  // org_count comes via the first payload entry's data
  const orgCount = (payload[0] as any)?.payload?.org_count ?? 0;

  return (
    <div
      style={{
        backgroundColor: '#1F2937',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '10px 14px',
        color: '#F3F4F6',
        fontSize: '13px',
      }}
    >
      <p style={{ color: '#D1D5DB', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {avgItem && (
        <p style={{ color: '#3B82F6' }}>
          Avg Score: <strong>{avgItem.value}</strong>/100
        </p>
      )}
      {maxItem && (
        <p style={{ color: '#6EE7B7' }}>
          Max Score: <strong>{maxItem.value}</strong>/100
        </p>
      )}
      {minItem && (
        <p style={{ color: '#FCA5A5' }}>
          Min Score: <strong>{minItem.value}</strong>/100
        </p>
      )}
      <p style={{ color: '#9CA3AF', marginTop: 4 }}>
        Organisations: <strong>{orgCount}</strong>
      </p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AdminComplianceTrend() {
  const { data, isLoading } = useAdminComplianceTrend();

  if (isLoading) {
    return <div className="h-[400px] bg-gray-700/50 animate-pulse rounded-lg" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        No compliance data available across organisations.
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    label: formatPeriodLabel(point.period_end),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="label"
          stroke="#9CA3AF"
          style={{ fontSize: '11px' }}
          tick={{ fill: '#9CA3AF' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          stroke="#9CA3AF"
          style={{ fontSize: '11px' }}
          tick={{ fill: '#9CA3AF' }}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<ComplianceTooltip />} />

        {/* Max band top — filled with subtle blue */}
        <Area
          type="monotone"
          dataKey="max_score"
          name="Max Score"
          fill="#3B82F6"
          fillOpacity={0.15}
          stroke="none"
          legendType="none"
        />

        {/* Min band bottom — filled with background colour to create band effect */}
        <Area
          type="monotone"
          dataKey="min_score"
          name="Min Score"
          fill="#1F2937"
          fillOpacity={1}
          stroke="none"
          legendType="none"
        />

        {/* Avg score line */}
        <Line
          type="monotone"
          dataKey="avg_score"
          name="Avg Score"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
