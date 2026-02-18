/**
 * Treatment detail page
 *
 * Server component displaying full treatment record including photos from
 * Supabase Storage, worker info, injury details, and signature.
 */

import { createClient } from '@/lib/supabase/server';
import { fetchTreatmentById } from '@/lib/queries/treatments';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { EventIncidentReportCard } from '@/components/dashboard/EventIncidentReportCard';
import { FAIncidentReportCard } from '@/components/dashboard/FAIncidentReportCard';
import { MotorsportIncidentReportCard } from '@/components/dashboard/MotorsportIncidentReportCard';

interface TreatmentDetailPageProps {
  params: Promise<{ id: string }>;
}

// Client component for date rendering to avoid hydration mismatch
function DateDisplay({ date }: { date: string }) {
  return (
    <span suppressHydrationWarning>
      {format(new Date(date), 'dd/MM/yyyy HH:mm')}
    </span>
  );
}

export default async function TreatmentDetailPage({
  params,
}: TreatmentDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const treatment = await fetchTreatmentById(supabase, id);

  if (!treatment) {
    notFound();
  }

  const severityColorMap: Record<string, string> = {
    minor: 'bg-green-500 text-white',
    moderate: 'bg-yellow-500 text-white',
    major: 'bg-orange-500 text-white',
    critical: 'bg-red-600 text-white',
  };

  const outcomeColorMap: Record<string, string> = {
    returned_to_work: 'bg-green-500 text-white',
    sent_home: 'bg-yellow-500 text-white',
    hospital_referral: 'bg-orange-500 text-white',
    ambulance_called: 'bg-red-600 text-white',
  };

  // Format helper
  const formatField = (value: string | null) => {
    if (!value) return '-';
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Photo URLs from Supabase Storage
  const photoUrls =
    treatment.photo_uris?.map((path: string) =>
      supabase.storage.from('treatment-photos').getPublicUrl(path).data.publicUrl
    ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/treatments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Treatment Log
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Treatment Details</h1>
          <p className="text-muted-foreground">
            <DateDisplay date={treatment.created_at} />
            {treatment.is_riddor_reportable && !['motorsport', 'festivals', 'sporting_events', 'fairs_shows', 'private_events'].includes(treatment.event_vertical ?? '') && (
              <Badge variant="destructive" className="ml-2">
                RIDDOR
              </Badge>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Worker / Attendee Info — label is vertical-aware */}
        <Card>
          <CardHeader>
            <CardTitle>
              {treatment.event_vertical === 'festivals' ? 'Attendee Information' : 'Worker Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg">
                {treatment.worker
                  ? `${treatment.worker.first_name} ${treatment.worker.last_name}`
                  : 'Unknown Worker'}
              </p>
            </div>
            {treatment.worker?.company && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {treatment.event_vertical === 'festivals' ? 'Event Organiser' : 'Client'}
                </p>
                <p>{treatment.worker.company}</p>
              </div>
            )}
            {treatment.worker?.role && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p>{treatment.worker.role}</p>
              </div>
            )}
            {/* Venue / Site — shown when vertical_extra_fields contains a venue name */}
            {treatment.event_vertical === 'festivals' &&
              treatment.vertical_extra_fields &&
              typeof treatment.vertical_extra_fields === 'object' &&
              'venue_name' in treatment.vertical_extra_fields &&
              !!treatment.vertical_extra_fields.venue_name && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Venue</p>
                  <p>{String(treatment.vertical_extra_fields.venue_name)}</p>
                </div>
              )}
            {treatment.event_vertical !== 'festivals' &&
              treatment.vertical_extra_fields &&
              typeof treatment.vertical_extra_fields === 'object' &&
              'site_name' in treatment.vertical_extra_fields &&
              !!treatment.vertical_extra_fields.site_name && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Site</p>
                  <p>{String(treatment.vertical_extra_fields.site_name)}</p>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Injury Details */}
        <Card>
          <CardHeader>
            <CardTitle>Injury Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Injury Type
              </p>
              <p>{formatField(treatment.injury_type)}</p>
            </div>
            {treatment.body_part && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Body Part
                </p>
                <p>{formatField(treatment.body_part)}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Severity
              </p>
              <Badge
                className={
                  severityColorMap[treatment.severity] || 'bg-gray-500'
                }
              >
                {formatField(treatment.severity)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Treatment */}
        <Card>
          <CardHeader>
            <CardTitle>Treatment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {treatment.treatment_notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Treatment Notes
                </p>
                <p className="whitespace-pre-wrap">{treatment.treatment_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outcome */}
        <Card>
          <CardHeader>
            <CardTitle>Outcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {treatment.outcome && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Outcome
                </p>
                <Badge
                  className={
                    outcomeColorMap[treatment.outcome] || 'bg-gray-500'
                  }
                >
                  {formatField(treatment.outcome)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purple Guide — Event Incident Report (festivals only) */}
      {treatment.event_vertical === 'festivals' && (
        <EventIncidentReportCard treatmentId={treatment.id} />
      )}

      {/* FA / SGSA Match Day Report (sporting_events only) */}
      {treatment.event_vertical === 'sporting_events' && (
        <FAIncidentReportCard treatmentId={treatment.id} />
      )}

      {/* Motorsport UK Accident Form (motorsport only) */}
      {treatment.event_vertical === 'motorsport' && (
        <MotorsportIncidentReportCard treatmentId={treatment.id} />
      )}

      {/* Photos */}
      {photoUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos ({photoUrls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photoUrls.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-square overflow-hidden rounded-lg border"
                >
                  <Image
                    src={url}
                    alt={`Treatment photo ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      {treatment.signature_uri && (
        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full max-w-md h-32 border rounded-lg overflow-hidden bg-white">
              <Image
                src={treatment.signature_uri}
                alt="Patient signature"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 400px"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
