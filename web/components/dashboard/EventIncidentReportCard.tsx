'use client';

/**
 * EventIncidentReportCard
 * Phase 20: Festivals / Events Vertical - Plan 04
 *
 * Purple Guide Event Incident Report download card for the festivals vertical.
 * Shown on the treatment detail page when event_vertical === 'festivals'.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateEventIncidentPDF } from '@/lib/queries/event-incidents';

interface EventIncidentReportCardProps {
  treatmentId: string;
}

export function EventIncidentReportCard({ treatmentId }: EventIncidentReportCardProps) {
  const generateMutation = useMutation({
    mutationFn: () => generateEventIncidentPDF(treatmentId),
    onSuccess: (data) => {
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
      }
    },
    onError: () => {
      toast.error('Failed to generate Event Incident Report. Please try again.');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purple Guide &mdash; Event Incident Report</CardTitle>
        <CardDescription>
          Pre-filled incident report for festival and event medical teams per the Events Industry Forum Purple Guide
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
                Generate Event Incident Report
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Click to generate a pre-filled Event Incident Report in accordance with Purple Guide recommendations.
          Review all information for accuracy before sharing with the event organiser or safety officer.
        </p>
      </CardContent>
    </Card>
  );
}
