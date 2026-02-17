/**
 * Worker Health Record Detail Page
 *
 * Server component showing:
 *  - Worker profile (name, company, role, phone, emergency contact, health_notes)
 *  - Consent records (type, granted date, signature thumbnail)
 *  - Treatment history (date, severity, outcome) with link to /treatments/[id]
 *  - GDPR request form (export / deletion) → inserts into erasure_requests table
 *
 * Workers are DB records, not auth users — this page is admin-accessible only.
 * Satisfies GDPR audit obligations for data subject access.
 */

import { createClient } from '@/lib/supabase/server';
import { fetchWorkerById, fetchWorkerTreatments, fetchWorkerConsentRecords } from '@/lib/queries/workers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Phone, Shield, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { WorkerGdprForm } from '@/components/dashboard/worker-gdpr-form';

interface WorkerDetailPageProps {
  params: Promise<{ id: string }>;
}

function DateDisplay({ date }: { date: string }) {
  return (
    <span suppressHydrationWarning>
      {format(new Date(date), 'dd/MM/yyyy HH:mm')}
    </span>
  );
}

const severityColorMap: Record<string, string> = {
  minor: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  major: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const outcomeColorMap: Record<string, string> = {
  returned_to_work: 'bg-green-100 text-green-800',
  sent_home: 'bg-yellow-100 text-yellow-800',
  hospital_referral: 'bg-orange-100 text-orange-800',
  ambulance_called: 'bg-red-100 text-red-800',
};

function formatField(value: string | null): string {
  if (!value) return '—';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function WorkerDetailPage({ params }: WorkerDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [worker, treatments, consentRecords] = await Promise.all([
    fetchWorkerById(supabase, id),
    fetchWorkerTreatments(supabase, id),
    fetchWorkerConsentRecords(supabase, id),
  ]);

  if (!worker) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/workers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Worker Registry
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">
          {worker.first_name} {worker.last_name}
        </h1>
        <p className="text-muted-foreground">
          {worker.company && <span>{worker.company} · </span>}
          {worker.role || 'No role specified'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Worker Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Worker Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-base">{worker.first_name} {worker.last_name}</p>
            </div>
            {worker.company && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="text-base">{worker.company}</p>
              </div>
            )}
            {worker.role && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="text-base">{worker.role}</p>
              </div>
            )}
            {worker.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-base flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {worker.phone}
                </p>
              </div>
            )}
            {(worker.emergency_contact_name || worker.emergency_contact_phone) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                {worker.emergency_contact_name && <p className="text-base">{worker.emergency_contact_name}</p>}
                {worker.emergency_contact_phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {worker.emergency_contact_phone}
                  </p>
                )}
              </div>
            )}
            {worker.health_notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Health Notes</p>
                <p className="text-base whitespace-pre-wrap">{worker.health_notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Registered</p>
              <p className="text-sm" suppressHydrationWarning>
                {format(new Date(worker.created_at), 'dd/MM/yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Consent Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Consent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consentRecords.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No formal consent records found.</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Legacy consent field:</p>
                  <Badge
                    variant="outline"
                    className={worker.consent_given
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    }
                  >
                    {worker.consent_given ? 'Given' : 'Not Given'}
                  </Badge>
                </div>
                {worker.consent_date && (
                  <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                    Date: {format(new Date(worker.consent_date), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {consentRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{formatField(record.consent_type)}</p>
                      <Badge
                        variant="outline"
                        className={record.granted
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }
                      >
                        {record.granted ? 'Granted' : 'Not Granted'}
                      </Badge>
                    </div>
                    {record.granted_at && (
                      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                        Granted: {format(new Date(record.granted_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    )}
                    {record.revoked_at && (
                      <p className="text-xs text-red-600" suppressHydrationWarning>
                        Revoked: {format(new Date(record.revoked_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    )}
                    {record.signature_uri && (
                      <div className="relative w-full max-w-xs h-16 border rounded bg-white overflow-hidden">
                        <Image
                          src={record.signature_uri}
                          alt="Consent signature"
                          fill
                          className="object-contain"
                          sizes="280px"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Treatment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Treatment History ({treatments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {treatments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No treatment records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Injury</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Severity</th>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Outcome</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">RIDDOR</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {treatments.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <DateDisplay date={t.created_at} />
                      </td>
                      <td className="py-2 pr-4">{formatField(t.injury_type)}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant="outline"
                          className={severityColorMap[t.severity] || 'bg-gray-100 text-gray-700'}
                        >
                          {formatField(t.severity)}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {t.outcome ? (
                          <Badge
                            variant="outline"
                            className={outcomeColorMap[t.outcome] || 'bg-gray-100 text-gray-700'}
                          >
                            {formatField(t.outcome)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {t.is_riddor_reportable ? (
                          <Badge variant="destructive">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </td>
                      <td className="py-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/treatments/${t.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GDPR Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            GDPR Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Submit a data export or deletion request on behalf of this worker (UK GDPR Art. 15–17).
            Requests will appear in the <Link href="/admin/gdpr" className="underline hover:text-foreground">GDPR dashboard</Link> for processing.
          </p>
          <WorkerGdprForm workerId={worker.id} workerName={`${worker.first_name} ${worker.last_name}`} />
        </CardContent>
      </Card>
    </div>
  );
}
