/**
 * RIDDOR Incident Detail Page
 * Phase 6: RIDDOR Auto-Flagging - Plan 04
 * Enhanced in Phase 13-04: Auto-save, audit trail, photo gallery
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  fetchRIDDORIncident,
  fetchRIDDORStatusHistory,
  updateRIDDORDraft,
  generateF2508PDF,
  type StatusHistoryEntry,
} from '@/lib/queries/riddor';
import { createClient } from '@/lib/supabase/client';
import { RIDDORStatusBadge } from '@/components/riddor/RIDDORStatusBadge';
import { DeadlineCountdown } from '@/components/riddor/DeadlineCountdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Camera, Clock, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function RIDDORDetailPage() {
  const params = useParams();
  const incidentId = params.id as string;
  const queryClient = useQueryClient();
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Draft state for auto-save
  const [draftCategory, setDraftCategory] = useState<string>('');
  const [draftOverrideReason, setDraftOverrideReason] = useState<string>('');

  // Auto-save refs — use useRef to avoid re-renders
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);

  // Fetch RIDDOR incident with 60-second polling
  const { data: incident, isLoading } = useQuery({
    queryKey: ['riddor-incident', incidentId],
    queryFn: () => fetchRIDDORIncident(incidentId),
    refetchInterval: 60000,
  });

  // Fetch status history (audit trail)
  const { data: statusHistory } = useQuery({
    queryKey: ['riddor-status-history', incidentId],
    queryFn: () => fetchRIDDORStatusHistory(incidentId),
    refetchInterval: 60000,
  });

  // Initialize draft state once from incident data (one-time, no auto-save)
  useEffect(() => {
    if (incident && !hasInitialized.current) {
      setDraftCategory(incident.category || '');
      setDraftOverrideReason(incident.override_reason || '');
      hasInitialized.current = true;
    }
  }, [incident]);

  // Auto-save: 30-second debounce, only for drafts
  useEffect(() => {
    if (!hasInitialized.current || incident?.status !== 'draft') return;

    // Clear any pending timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Schedule new save — silent (no toast)
    autoSaveTimer.current = setTimeout(() => {
      updateRIDDORDraft(incidentId, {
        category: draftCategory,
        override_reason: draftOverrideReason,
      }).catch(() => {
        // Silent failure — auto-save is best-effort
      });
    }, 30000);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [draftCategory, draftOverrideReason, incidentId, incident?.status]);

  // Save on unmount if draft
  useEffect(() => {
    return () => {
      if (hasInitialized.current && incident?.status === 'draft') {
        if (autoSaveTimer.current) {
          clearTimeout(autoSaveTimer.current);
        }
        updateRIDDORDraft(incidentId, {
          category: draftCategory,
          override_reason: draftOverrideReason,
        }).catch(() => {
          // Silent failure on unmount
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute public photo URLs from treatment-photos bucket
  const supabaseClient = createClient();
  const photoUrls = ((incident as { treatments?: { photo_uris?: string[] | null } } | null)?.treatments?.photo_uris || []).map(
    (path: string) =>
      supabaseClient.storage.from('treatment-photos').getPublicUrl(path).data.publicUrl
  );

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
      toast.error('Failed to generate F2508 PDF. Please try again.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg md:col-span-2" />
        </div>
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

        {/* Draft Review — editable fields for draft incidents */}
        {incident.status === 'draft' && (
          <Card className="md:col-span-2 border-amber-300/50">
            <CardHeader>
              <CardTitle>Draft Review</CardTitle>
              <CardDescription>
                Edit category and override reason before submitting. Changes auto-save every 30 seconds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="draft-category" className="block text-sm font-medium text-muted-foreground mb-1">
                  RIDDOR Category
                </label>
                <select
                  id="draft-category"
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select category...</option>
                  <option value="over_7_day_incapacitation">Over 7 Day Incapacitation</option>
                  <option value="specified_injury">Specified Injury</option>
                  <option value="dangerous_occurrence">Dangerous Occurrence</option>
                  <option value="occupational_disease">Occupational Disease</option>
                  <option value="gas_incident">Gas Incident</option>
                </select>
              </div>
              <div>
                <label htmlFor="draft-override-reason" className="block text-sm font-medium text-muted-foreground mb-1">
                  Override Reason
                </label>
                <textarea
                  id="draft-override-reason"
                  value={draftOverrideReason}
                  onChange={(e) => setDraftOverrideReason(e.target.value)}
                  rows={4}
                  placeholder="Explain why this incident requires RIDDOR reporting or why the auto-flagged category should be changed..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                />
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Status History / Audit Trail */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status History
            </CardTitle>
            <CardDescription>
              Audit trail of all status changes for this incident
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!statusHistory || statusHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No status changes recorded yet.
              </p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-3 space-y-4">
                {statusHistory.map((entry: StatusHistoryEntry) => (
                  <li key={entry.id} className="ml-6">
                    <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-2 ring-white">
                      <Clock className="h-2.5 w-2.5 text-blue-600" />
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      Status changed:{' '}
                      <span className="capitalize">{entry.from_status ?? 'initial'}</span>
                      {' → '}
                      <span className="capitalize">{entry.to_status}</span>
                      {entry.actor_name && (
                        <span className="text-muted-foreground font-normal">
                          {' '}by {entry.actor_name}
                        </span>
                      )}
                    </p>
                    <time className="text-xs text-muted-foreground">
                      {new Date(entry.changed_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Evidence Photos */}
        {photoUrls.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Evidence Photos
              </CardTitle>
              <CardDescription>
                Photos captured during treatment from the treatment-photos bucket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photoUrls.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-square overflow-hidden rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={url}
                      alt={`Evidence photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    />
                    <div className="absolute bottom-1 right-1">
                      <Download className="h-4 w-4 text-white drop-shadow" />
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
