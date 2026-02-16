/**
 * ComplianceScore - Traffic-light compliance status indicator
 *
 * Displays red/amber/green compliance status based on:
 * - Daily safety check completion
 * - Overdue follow-ups
 * - Expired certifications
 * - RIDDOR reporting deadlines
 *
 * Polls every 60 seconds via useComplianceData hook.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useComplianceData, calculateComplianceStatus, ComplianceData } from '@/lib/queries/compliance';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface ComplianceScoreProps {
  initialData: ComplianceData;
}

export function ComplianceScore({ initialData }: ComplianceScoreProps) {
  const { data } = useComplianceData(initialData);

  if (!data) {
    return null;
  }

  const status = calculateComplianceStatus(data);

  // Traffic light colors
  const statusConfig = {
    green: {
      color: 'bg-green-500',
      label: 'Compliant',
      description: 'All compliance checks passed',
    },
    amber: {
      color: 'bg-amber-500',
      label: 'Attention Required',
      description: 'Some issues need attention',
    },
    red: {
      color: 'bg-red-500',
      label: 'Critical Issues',
      description: 'Immediate action required',
    },
  };

  const config = statusConfig[status];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Traffic light indicator */}
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full ${config.color}`}
            aria-label={`Compliance status: ${config.label}`}
          />
          <div>
            <div className="text-xl font-semibold">{config.label}</div>
            <div className="text-sm text-muted-foreground">{config.description}</div>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">Compliance Breakdown</h3>

          {/* Daily check */}
          <div className="flex items-center gap-2">
            {data.dailyCheckDone ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm">
              Daily safety check {data.dailyCheckDone ? 'completed' : 'not completed'}
            </span>
          </div>

          {/* Overdue follow-ups */}
          {data.overdueFollowups > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm">
                {data.overdueFollowups} overdue follow-up{data.overdueFollowups !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Expired certifications */}
          {data.expiredCerts > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm">
                {data.expiredCerts} expired certification{data.expiredCerts !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* RIDDOR deadlines */}
          {data.riddorDeadlines > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm">
                {data.riddorDeadlines} RIDDOR deadline{data.riddorDeadlines !== 1 ? 's' : ''} approaching
              </span>
            </div>
          )}

          {/* All clear message */}
          {status === 'green' && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm">No overdue follow-ups</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
