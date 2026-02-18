/**
 * OrgComplianceTable - Organisation Compliance Ranking Table
 *
 * Displays all organisations ranked by compliance score (best to worst).
 * Top 5 rows highlighted with green accent, bottom 5 with red accent.
 * Shows trend arrows (up/down/stable) and previous score.
 *
 * Platform admin analytics — ANLT-06.
 */

'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useOrgComplianceRanking } from '@/lib/queries/analytics/compliance-history';
import type { OrgComplianceRanking } from '@/lib/queries/analytics/compliance-history';

// =============================================================================
// HELPERS
// =============================================================================

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function TrendIcon({ trend }: { trend: OrgComplianceRanking['trend'] }) {
  if (trend === 'up') return <ArrowUp className="inline w-4 h-4 text-green-400" />;
  if (trend === 'down') return <ArrowDown className="inline w-4 h-4 text-red-400" />;
  return <Minus className="inline w-4 h-4 text-gray-400" />;
}

function getRowAccent(rank: number, total: number): string {
  if (rank <= 5) return 'border-l-4 border-green-500';
  if (rank > total - 5) return 'border-l-4 border-red-500';
  return '';
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OrgComplianceTable() {
  const { data, isLoading } = useOrgComplianceRanking();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-700/50 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-400">
        No compliance data available yet.
      </div>
    );
  }

  const total = data.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Organisation
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">
              Score
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
              Trend
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">
              Previous
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.map((org, index) => {
            const rank = index + 1;
            const accentClass = getRowAccent(rank, total);

            return (
              <tr
                key={org.org_id}
                className={`hover:bg-gray-700/40 transition-colors ${accentClass}`}
              >
                {/* Rank */}
                <td className="px-4 py-3 text-gray-400 font-medium">{rank}</td>

                {/* Organisation Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{org.org_name}</span>
                    {rank <= 5 && (
                      <span className="text-xs text-green-400 font-semibold px-1.5 py-0.5 bg-green-500/10 rounded">
                        Top Performers
                      </span>
                    )}
                    {rank > total - 5 && (
                      <span className="text-xs text-red-400 font-semibold px-1.5 py-0.5 bg-red-500/10 rounded">
                        Needs Improvement
                      </span>
                    )}
                  </div>
                </td>

                {/* Score */}
                <td className="px-4 py-3 text-center">
                  <span className={`text-lg font-bold ${getScoreColor(org.latest_score)}`}>
                    {org.latest_score}
                  </span>
                  <span className="text-gray-500 text-xs">/100</span>
                </td>

                {/* Trend */}
                <td className="px-4 py-3 text-center">
                  <TrendIcon trend={org.trend} />
                </td>

                {/* Previous Score */}
                <td className="px-4 py-3 text-center">
                  {org.previous_score !== null ? (
                    <span className={`text-sm ${getScoreColor(org.previous_score)}`}>
                      {org.previous_score}
                      <span className="text-gray-500">/100</span>
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
