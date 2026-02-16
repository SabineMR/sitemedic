/**
 * RIDDOR Incident Detail Page
 * Phase 6: RIDDOR Auto-Flagging - Plan 04
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchRIDDORIncident, generateF2508PDF } from '@/lib/queries/riddor';
import { RIDDORStatusBadge } from '@/components/riddor/RIDDORStatusBadge';
import { DeadlineCountdown } from '@/components/riddor/DeadlineCountdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText } from 'lucide-react';

export default function RIDDORDetailPage() {
  const params = useParams();
  const incidentId = params.id as string;
  const queryClient = useQueryClient();
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Fetch RIDDOR incident with 60-second polling
  const { data: incident, isLoading } = useQuery({
    queryKey: ['riddor-incident', incidentId],
    queryFn: () => fetchRIDDORIncident(incidentId),
    refetchInterval: 60000,
  });

  // Generate F2508 PDF mutation
  const generatePDFMutation = useMutation({
    mutationFn: async () => {
      setGeneratingPDF(true);
      const result = await generateF2508PDF(incidentId);
      return result;
    },
    onSuccess: (data) => {
      setGeneratingPDF(false);
      // Refresh incident to get updated f2508_pdf_path
      queryClient.invalidateQueries({ queryKey: ['riddor-incident', incidentId] });

      // Download PDF
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
      }
    },
    onError: () => {
      setGeneratingPDF(false);
      alert('Failed to generate F2508 PDF. Please try again.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">Loading incident details...</div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          RIDDOR incident not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/riddor">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">RIDDOR Incident Detail</h1>
          <p className="text-muted-foreground">
            {incident.workers.first_name} {incident.workers.last_name} -{' '}
            {new Date(incident.detected_at).toLocaleDateString('en-GB')}
          </p>
        </div>
        <div className="flex gap-2">
          <RIDDORStatusBadge status={incident.status} />
          <Badge variant="outline" className={
            incident.confidence_level === 'HIGH'
              ? 'bg-red-50 text-red-700 border-red-200'
              : incident.confidence_level === 'MEDIUM'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-gray-50 text-gray-700 border-gray-200'
          }>
            {incident.confidence_level} Confidence
          </Badge>
        </div>
      </div>

      {/* Deadline Alert */}
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">HSE Reporting Deadline</h3>
              <p className="text-sm text-muted-foreground">
                {incident.category === 'specified_injury'
                  ? '10 days from incident date'
                  : '15 days from incident date'}
                {' - '}
                {new Date(incident.deadline_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <DeadlineCountdown deadlineDate={incident.deadline_date} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Worker Information */}
        <Card>
          <CardHeader>
            <CardTitle>Worker Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div>{incident.workers.first_name} {incident.workers.last_name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Company</div>
              <div>{incident.workers.company || 'Not specified'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Role</div>
              <div>{incident.workers.role || 'Not specified'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Incident Details */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Category</div>
              <div className="capitalize">{incident.category.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Detected</div>
              <div>
                {new Date(incident.detected_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Auto-flagged</div>
              <div>{incident.auto_flagged ? 'Yes' : 'No'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Treatment Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Treatment Information</CardTitle>
            <CardDescription>
              Reference: {incident.treatments.reference_number}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Injury Type</div>
                <div className="capitalize">{incident.treatments.injury_type.replace(/-/g, ' ')}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Body Part</div>
                <div className="capitalize">{incident.treatments.body_part?.replace(/_/g, ' ') || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Severity</div>
                <div className="capitalize">{incident.treatments.severity}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Outcome</div>
                <div className="capitalize">{incident.treatments.outcome?.replace(/_/g, ' ') || 'Not specified'}</div>
              </div>
            </div>
            {incident.treatments.mechanism_of_injury && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Mechanism of Injury</div>
                <div>{incident.treatments.mechanism_of_injury}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medic Override */}
        {incident.medic_confirmed !== null && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Medic Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Decision</div>
                <div>
                  {incident.medic_confirmed ? (
                    <Badge className="bg-green-100 text-green-800">Confirmed as RIDDOR</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">Dismissed (Not RIDDOR)</Badge>
                  )}
                </div>
              </div>
              {incident.override_reason && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Reason</div>
                  <div>{incident.override_reason}</div>
                </div>
              )}
              {incident.overridden_at && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Reviewed At</div>
                  <div>
                    {new Date(incident.overridden_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* F2508 Generation */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>HSE F2508 Report</CardTitle>
            <CardDescription>
              Pre-filled RIDDOR report form for HSE submission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => generatePDFMutation.mutate()}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <>Generating PDF...</>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate F2508 PDF
                  </>
                )}
              </Button>
              {incident.f2508_pdf_path && (
                <p className="text-sm text-muted-foreground">
                  Last generated: {new Date(incident.updated_at).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Click to generate a pre-filled HSE F2508 form. Review all information for accuracy
              before submitting to HSE at https://www.hse.gov.uk/riddor/report.htm
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
