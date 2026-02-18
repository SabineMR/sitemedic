'use client';

/**
 * FAIncidentReportCard
 * Phase 22: Football Sports Vertical - Plan 05
 *
 * FA / SGSA Match Day Report download card for the sporting_events vertical.
 * Shown on the treatment detail page when event_vertical === 'sporting_events'.
 */

import { useMutation } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateFAIncidentPDF } from '@/lib/queries/fa-incidents';

interface FAIncidentReportCardProps {
  treatmentId: string;
}

export function FAIncidentReportCard({ treatmentId }: FAIncidentReportCardProps) {
  const generateMutation = useMutation({
    mutationFn: () => generateFAIncidentPDF(treatmentId),
    onSuccess: (data) => {
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
      }
    },
    onError: () => {
      alert('Failed to generate FA / SGSA Match Day Report. Please try again.');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>FA / SGSA Match Day Report</CardTitle>
        <CardDescription>
          Pre-filled match day incident report for football medical teams &mdash; FA Injury Report for player injuries, SGSA Medical Incident Report for spectator injuries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>Generating PDF...</>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate FA / SGSA Match Day Report
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Click to generate a pre-filled match day report. The correct form (FA or SGSA) is selected automatically based on patient type.
          Review all information before sharing with the club or venue safety officer.
        </p>
      </CardContent>
    </Card>
  );
}
