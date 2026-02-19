'use client';

/**
 * MotorsportIncidentReportCard
 * Phase 23: Gap Closure — Plan 06 (MOTO-07)
 *
 * Motorsport UK Accident Form download card for the motorsport vertical.
 * Shown on the treatment detail page when event_vertical === 'motorsport'.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateMotorsportIncidentPDF } from '@/lib/queries/motorsport-incidents';

interface MotorsportIncidentReportCardProps {
  treatmentId: string;
}

export function MotorsportIncidentReportCard({ treatmentId }: MotorsportIncidentReportCardProps) {
  const generateMutation = useMutation({
    mutationFn: () => generateMotorsportIncidentPDF(treatmentId),
    onSuccess: (data) => {
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
      }
    },
    onError: () => {
      toast.error('Failed to generate Motorsport Incident Report. Please try again.');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motorsport UK &mdash; Accident Form</CardTitle>
        <CardDescription>
          Pre-filled Motorsport UK Accident Form generated from this treatment record for submission to race control or Motorsport UK
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
                Generate Motorsport Incident Report
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Click to generate a pre-filled Motorsport UK Accident Form. Review all information for accuracy before sharing with race control or the Clerk of the Course.
        </p>
      </CardContent>
    </Card>
  );
}
