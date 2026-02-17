/**
 * RIDDOR Analytics Dashboard
 * Phase 6: RIDDOR Auto-Flagging - Plan 06
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchOverrideStats, fetchOverrideReasons } from '@/lib/queries/riddor-analytics';
import { OverridePatternChart } from '@/components/riddor/OverridePatternChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOrg } from '@/contexts/org-context';

export default function RIDDORAnalyticsPage() {
  const { orgId, loading: orgLoading } = useOrg();

  // Fetch override statistics with 5-minute polling
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['riddor-override-stats', orgId],
    queryFn: async () => {
      return fetchOverrideStats(orgId!);
    },
    enabled: !!orgId,
    refetchInterval: 300000, // 5 minutes
  });

  // Fetch common override reasons
  const { data: reasons = [], isLoading: reasonsLoading } = useQuery({
    queryKey: ['riddor-override-reasons', orgId],
    queryFn: async () => {
      return fetchOverrideReasons(orgId!);
    },
    enabled: !!orgId,
    refetchInterval: 300000, // 5 minutes
  });

  if (orgLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (!orgId) {
    return <div className="text-center py-8 text-muted-foreground">No organization assigned</div>;
  }

  const isLoading = statsLoading || reasonsLoading;

  // Check for high override rate alert (>80% per Research)
  const showHighOverrideAlert = stats && stats.overrideRate >= 80;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/riddor">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">RIDDOR Analytics</h1>
          <p className="text-muted-foreground">
            Override patterns and detection accuracy
          </p>
        </div>
      </div>

      {/* High Override Rate Alert */}
      {showHighOverrideAlert && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>High Override Rate Detected</AlertTitle>
          <AlertDescription>
            The overall override rate of {stats.overrideRate.toFixed(1)}% exceeds the 80% threshold.
            This indicates the detection algorithm may need review and tuning to reduce false positives.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Flagged</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAutoFlags || 0}</div>
            <p className="text-xs text-muted-foreground">Total detections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.confirmed || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.totalAutoFlags > 0
                ? `${((stats.confirmed / stats.totalAutoFlags) * 100).toFixed(1)}% of flags`
                : '0% of flags'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.dismissed || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats && stats.totalAutoFlags > 0
                ? `${((stats.dismissed / stats.totalAutoFlags) * 100).toFixed(1)}% of flags`
                : '0% of flags'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting medic decision</p>
          </CardContent>
        </Card>
      </div>

      {/* Override Rate by Confidence Level */}
      <Card>
        <CardHeader>
          <CardTitle>Override Rate by Confidence Level</CardTitle>
          <CardDescription>
            Percentage of auto-flags dismissed by medics (lower is better)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Loading chart data...
            </div>
          ) : stats ? (
            <>
              <OverridePatternChart
                highConfidence={stats.highConfidenceStats}
                mediumConfidence={stats.mediumConfidenceStats}
                lowConfidence={stats.lowConfidenceStats}
              />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">HIGH Confidence</span>
                    <Badge className={
                      stats.highConfidenceStats.overrideRate >= 50
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }>
                      {stats.highConfidenceStats.overrideRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.highConfidenceStats.dismissed} dismissed /{' '}
                    {stats.highConfidenceStats.confirmed + stats.highConfidenceStats.dismissed} reviewed
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">MEDIUM Confidence</span>
                    <Badge className={
                      stats.mediumConfidenceStats.overrideRate >= 50
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }>
                      {stats.mediumConfidenceStats.overrideRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.mediumConfidenceStats.dismissed} dismissed /{' '}
                    {stats.mediumConfidenceStats.confirmed + stats.mediumConfidenceStats.dismissed} reviewed
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">LOW Confidence</span>
                    <Badge className={
                      stats.lowConfidenceStats.overrideRate >= 50
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }>
                      {stats.lowConfidenceStats.overrideRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.lowConfidenceStats.dismissed} dismissed /{' '}
                    {stats.lowConfidenceStats.confirmed + stats.lowConfidenceStats.dismissed} reviewed
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Common Override Reasons */}
      <Card>
        <CardHeader>
          <CardTitle>Top Override Reasons</CardTitle>
          <CardDescription>
            Most common reasons medics give for dismissing RIDDOR flags
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reasons...</div>
          ) : reasons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No override reasons recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {reasons.map((reason, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{reason.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      {reason.count} occurrence{reason.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {reason.percentage.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Algorithm Tuning Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Algorithm Tuning Recommendations</CardTitle>
          <CardDescription>
            Suggested improvements based on override patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.highConfidenceStats.overrideRate && stats.highConfidenceStats.overrideRate > 20 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>HIGH Confidence False Positives</AlertTitle>
                <AlertDescription>
                  HIGH confidence flags have {stats.highConfidenceStats.overrideRate.toFixed(1)}% override rate.
                  Review detection rules for HIGH confidence criteria - these should rarely be overridden.
                </AlertDescription>
              </Alert>
            )}

            {stats?.mediumConfidenceStats.overrideRate && stats.mediumConfidenceStats.overrideRate > 50 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>MEDIUM Confidence Needs Review</AlertTitle>
                <AlertDescription>
                  MEDIUM confidence flags have {stats.mediumConfidenceStats.overrideRate.toFixed(1)}% override rate.
                  Consider tightening detection criteria or moving some patterns to LOW confidence.
                </AlertDescription>
              </Alert>
            )}

            {!stats?.highConfidenceStats.overrideRate || stats.highConfidenceStats.overrideRate <= 20 ? (
              <div className="text-sm text-green-700 bg-green-50 p-4 rounded-lg">
                ✓ Detection algorithm performing well. Continue monitoring override patterns.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
