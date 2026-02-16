/**
 * Override Pattern Chart Component
 * Phase 6: RIDDOR Auto-Flagging - Plan 06
 */

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ConfidenceLevelStats } from '@/lib/queries/riddor-analytics';

interface OverridePatternChartProps {
  highConfidence: ConfidenceLevelStats;
  mediumConfidence: ConfidenceLevelStats;
  lowConfidence: ConfidenceLevelStats;
}

export function OverridePatternChart({
  highConfidence,
  mediumConfidence,
  lowConfidence,
}: OverridePatternChartProps) {
  const data = [
    {
      name: 'HIGH',
      'Override Rate': Number(highConfidence.overrideRate.toFixed(1)),
      'Total Flags': highConfidence.totalFlags,
    },
    {
      name: 'MEDIUM',
      'Override Rate': Number(mediumConfidence.overrideRate.toFixed(1)),
      'Total Flags': mediumConfidence.totalFlags,
    },
    {
      name: 'LOW',
      'Override Rate': Number(lowConfidence.overrideRate.toFixed(1)),
      'Total Flags': lowConfidence.totalFlags,
    },
  ];

  const getBarColor = (overrideRate: number) => {
    if (overrideRate >= 80) return '#ef4444'; // Red - needs review
    if (overrideRate >= 50) return '#f59e0b'; // Amber - warning
    return '#10b981'; // Green - good
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis label={{ value: 'Override Rate (%)', angle: -90, position: 'insideLeft' }} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null;
            const data = payload[0].payload;
            return (
              <div className="bg-white p-3 border rounded shadow-lg">
                <p className="font-semibold">{data.name} Confidence</p>
                <p className="text-sm">Override Rate: {data['Override Rate']}%</p>
                <p className="text-sm text-muted-foreground">Total Flags: {data['Total Flags']}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="Override Rate" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry['Override Rate'])} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
