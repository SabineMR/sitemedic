/**
 * Coverage Gap Alerts Component
 *
 * Displays territories with high rejection rates (>10%) and suggests
 * remediation actions based on territory state and booking volume.
 *
 * Visual styling:
 * - Critical (>25% rejection): Red border + red background
 * - Warning (10-25% rejection): Yellow border + yellow background
 * - Healthy: Green checkmark with success message
 */

'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TerritoryWithMetrics } from '@/lib/queries/admin/territories';
import { detectCoverageGaps, sortGapsBySeverity } from '@/lib/territory/coverage-gaps';

interface CoverageAlertsProps {
  territories: TerritoryWithMetrics[];
}

export default function CoverageAlerts({ territories }: CoverageAlertsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Detect and sort coverage gaps
  const gaps = sortGapsBySeverity(detectCoverageGaps(territories));

  // No coverage gaps - show success state
  if (gaps.length === 0) {
    return (
      <div className="px-8 pt-6">
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400">
            <span className="font-semibold">All territories have healthy coverage</span>
            {' '}&mdash; No territories with rejection rate above 10%
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="px-8 pt-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Coverage Gaps</h2>
          <Badge variant="destructive" className="bg-red-600">
            {gaps.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Gap Alerts */}
      {isExpanded && (
        <div className="space-y-3">
          {gaps.map((gap) => (
            <Alert
              key={gap.territory_id}
              className={
                gap.severity === 'critical'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-yellow-500 bg-yellow-500/10'
              }
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={
                    gap.severity === 'critical'
                      ? 'h-4 w-4 text-red-500 flex-shrink-0 mt-0.5'
                      : 'h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5'
                  }
                />
                <div className="flex-1 space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={gap.severity === 'critical' ? 'destructive' : 'default'}
                        className={
                          gap.severity === 'critical'
                            ? 'bg-red-600'
                            : 'bg-yellow-600'
                        }
                      >
                        {gap.severity === 'critical' ? 'Critical' : 'Warning'}
                      </Badge>
                      <span className="font-semibold text-white">
                        {gap.postcode_sector}
                      </span>
                      <span className="text-gray-400">
                        ({gap.region})
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <AlertDescription
                    className={
                      gap.severity === 'critical'
                        ? 'text-red-300'
                        : 'text-yellow-300'
                    }
                  >
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <span className="font-semibold">
                          {gap.rejected_bookings}/{gap.total_bookings}
                        </span>
                        {' '}rejected
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        <span className="font-semibold">
                          {gap.rejection_rate.toFixed(1)}%
                        </span>
                        {' '}rejection rate
                      </span>
                      {!gap.minimum_volume_met && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-400 italic">
                            Low volume - monitor before acting
                          </span>
                        </>
                      )}
                    </div>
                  </AlertDescription>

                  {/* Recommended Action */}
                  <div className="flex items-start gap-2 pt-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300">
                      {gap.recommended_action}
                    </p>
                  </div>

                  {/* View Territory Button */}
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        gap.severity === 'critical'
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
                          : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20'
                      }
                      onClick={() => {
                        // Scroll to territory in the list below
                        const territoryElement = document.getElementById(`territory-${gap.territory_id}`);
                        if (territoryElement) {
                          territoryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                    >
                      View Territory
                    </Button>
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
