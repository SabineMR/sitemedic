/**
 * RIDDOR Incidents List Page
 * Phase 6: RIDDOR Auto-Flagging - Plan 04
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchRIDDORIncidents } from '@/lib/queries/riddor';
import { RIDDORStatusBadge } from '@/components/riddor/RIDDORStatusBadge';
import { DeadlineCountdown } from '@/components/riddor/DeadlineCountdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function RIDDORPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'confirmed'>('all');

  // Fetch RIDDOR incidents with 60-second polling
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['riddor-incidents', statusFilter],
    queryFn: async () => {
      // For demo, using hardcoded org_id - replace with actual auth context
      const orgId = '10000000-0000-0000-0000-000000000001';
      return fetchRIDDORIncidents(orgId, statusFilter === 'all' ? undefined : statusFilter);
    },
    refetchInterval: 60000, // Poll every 60 seconds
  });

  const pendingCount = incidents.filter((i) => i.status === 'draft').length;
  const overdueCount = incidents.filter((i) => {
    const daysRemaining = Math.ceil(
      (new Date(i.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysRemaining < 0 && i.status === 'draft';
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">RIDDOR Incidents</h1>
        <p className="text-muted-foreground">
          HSE-reportable incidents with deadline tracking
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting submission to HSE</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Past HSE deadline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
            <p className="text-xs text-muted-foreground">All RIDDOR-flagged</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>RIDDOR Incidents</CardTitle>
              <CardDescription>
                Filter by status and view deadline countdown
              </CardDescription>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value: any) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Incidents</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading incidents...</div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No RIDDOR incidents found
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <Link
                  key={incident.id}
                  href={`/riddor/${incident.id}`}
                  className="block border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {incident.workers.first_name} {incident.workers.last_name}
                        </h3>
                        <Badge variant="outline" className={
                          incident.confidence_level === 'HIGH'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : incident.confidence_level === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }>
                          {incident.confidence_level}
                        </Badge>
                        <RIDDORStatusBadge status={incident.status} />
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <div>
                          <strong>Injury:</strong> {incident.treatments.injury_type.replace(/-/g, ' ')}
                          {' '} ({incident.treatments.body_part?.replace(/_/g, ' ') || 'unspecified'})
                        </div>
                        <div>
                          <strong>Category:</strong> {incident.category.replace(/_/g, ' ')}
                        </div>
                        <div>
                          <strong>Detected:</strong>{' '}
                          {new Date(incident.detected_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <DeadlineCountdown deadlineDate={incident.deadline_date} />
                      <div className="text-xs text-muted-foreground">
                        Deadline: {new Date(incident.deadline_date).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
