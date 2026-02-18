'use client';

import * as React from 'react';
import { ContractWithRelations } from '@/lib/contracts/types';
import { formatContractNumber } from '@/lib/contracts/utils';
import { ContractStatusBadge } from './contract-status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Send,
  Download,
  Copy,
  Ban,
  FileEdit,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Eye,
  PenTool,
} from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface ContractDetailProps {
  contract: ContractWithRelations;
}

/**
 * Format a contract event into a human-readable description.
 * Replaces raw JSON.stringify(event_data) rendering with proper messages.
 */
function formatEventDescription(
  eventType: string,
  eventData: Record<string, unknown>
): string {
  switch (eventType) {
    case 'status_change': {
      const from = String(eventData.from || '').replace(/_/g, ' ');
      const to = String(eventData.to || '').replace(/_/g, ' ');
      const reason = eventData.reason ? ` — ${eventData.reason}` : '';
      return `Status changed from ${from} to ${to}${reason}`;
    }
    case 'email_sent':
      return `Email sent to ${eventData.to || 'client'}`;
    case 'email_opened':
      return 'Client opened the email';
    case 'email_clicked':
      return 'Client clicked the contract link';
    case 'signature_captured':
      return `Signed by ${eventData.signedByName || 'Client'}`;
    case 'payment_captured': {
      const amount =
        typeof eventData.amount === 'number'
          ? new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'GBP',
            }).format(eventData.amount / 100)
          : '';
      return `Payment received${amount ? ': ' + amount : ''}`;
    }
    case 'version_created':
      return 'New version created';
    case 'amendment_created':
      return 'Amendment created';
    case 'terminated':
      return 'Contract terminated';
    default:
      return eventType.replace(/_/g, ' ');
  }
}

/**
 * Contract detail view with timeline, versions, and actions
 *
 * Two-column layout:
 * - Left: Contract details, payment schedule, actions
 * - Right: Status timeline, version history, signature
 */
export function ContractDetail({ contract }: ContractDetailProps) {
  const [copySuccess, setCopySuccess] = React.useState(false);
  const [downloadingVersion, setDownloadingVersion] = React.useState<
    number | null
  >(null);

  // Format GBP currency
  const formatGBP = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  // Format date (UK format)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get payment terms label
  const getPaymentTermsLabel = (terms: string) => {
    const labels: Record<string, string> = {
      full_prepay: 'Full Prepay',
      split_50_50: '50/50 Split',
      split_50_net30: '50% + Net 30',
      full_net30: 'Net 30',
      custom: 'Custom',
    };
    return labels[terms] || terms;
  };

  // Generate shareable URL
  const shareableUrl = contract.shareable_token
    ? `${window.location.origin}/contracts/${contract.id}/sign?token=${contract.shareable_token}`
    : null;

  // Copy signing link to clipboard
  const handleCopyLink = () => {
    if (shareableUrl) {
      navigator.clipboard.writeText(shareableUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  /**
   * Generate a signed URL (7 days / 604800 seconds) for a contract PDF
   * stored in Supabase Storage, then open it in a new tab.
   * Replaces dead /api/contracts/[id]/pdf route references.
   */
  async function handleDownloadPDF(storagePath: string, version: number) {
    setDownloadingVersion(version);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('contracts')
        .createSignedUrl(storagePath, 604800); // 7 days per D-05-02-001
      if (error || !data?.signedUrl) {
        console.error('Failed to generate download URL:', error);
        setDownloadingVersion(null);
        return;
      }
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Download error:', err);
    }
    setDownloadingVersion(null);
  }

  // Get event icon
  const getEventIcon = (eventType: string) => {
    const icons: Record<string, React.ReactNode> = {
      status_change: <Clock className="h-4 w-4" />,
      email_sent: <Mail className="h-4 w-4 text-blue-600" />,
      email_opened: <Eye className="h-4 w-4 text-indigo-600" />,
      signature_captured: <PenTool className="h-4 w-4 text-green-600" />,
      version_created: <FileEdit className="h-4 w-4 text-amber-600" />,
      terminated: <Ban className="h-4 w-4 text-red-600" />,
    };
    return icons[eventType] || <Clock className="h-4 w-4" />;
  };

  // Generate contract number
  const contractNumber = formatContractNumber(contract.id, contract.created_at);

  // Payment milestone tracker — amounts are in pence, divide by 100 for display
  const milestones = [
    ...(contract.upfront_amount > 0
      ? [
          {
            label: 'Upfront Payment',
            description: 'Due before service',
            amount: contract.upfront_amount,
            paid: !!contract.upfront_paid_at,
            paidAt: contract.upfront_paid_at,
          },
        ]
      : []),
    ...(contract.completion_amount > 0
      ? [
          {
            label: 'Completion Payment',
            description: 'Due on completion',
            amount: contract.completion_amount,
            paid: !!contract.completion_paid_at,
            paidAt: contract.completion_paid_at,
          },
        ]
      : []),
    ...(contract.net30_amount > 0
      ? [
          {
            label: 'Net 30 Payment',
            description: 'Due 30 days after completion',
            amount: contract.net30_amount,
            paid: !!contract.net30_paid_at,
            paidAt: contract.net30_paid_at,
          },
        ]
      : []),
  ];
  const paidCount = milestones.filter((m) => m.paid).length;
  const progressPercent =
    milestones.length > 0
      ? Math.round((paidCount / milestones.length) * 100)
      : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column - Details */}
      <div className="space-y-6 lg:col-span-2">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-mono">
                  {contractNumber}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Created {formatDate(contract.created_at)}
                </p>
              </div>
              <ContractStatusBadge status={contract.status} />
            </div>
          </CardHeader>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Company
                </div>
                <div className="font-medium">{contract.client?.company_name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Contact Email
                </div>
                <div className="font-medium">{contract.client?.contact_email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Phone
                </div>
                <div className="font-medium">
                  {contract.client?.contact_phone || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Payment Terms
                </div>
                <div className="font-medium">
                  {getPaymentTermsLabel(contract.payment_terms)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Site Address
                </div>
                <div className="font-medium">
                  {contract.booking?.site_name && (
                    <>{contract.booking.site_name}<br /></>
                  )}
                  {contract.booking?.site_address}, {contract.booking?.site_postcode}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Shift Date
                </div>
                <div className="font-medium">
                  {contract.booking?.shift_date
                    ? formatDate(contract.booking.shift_date)
                    : 'Not scheduled'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Event Type
                </div>
                <div className="font-medium">
                  {contract.booking?.event_vertical?.replace(/_/g, ' ') || 'General'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Total Price
                </div>
                <div className="font-medium text-lg">
                  {formatGBP(contract.booking?.total || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Schedule — visual milestone tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {milestones.length > 0 && (
              <>
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      Payment Progress
                    </span>
                    <span className="font-medium">
                      {paidCount}/{milestones.length} paid ({progressPercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Milestone steps */}
                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <div
                      key={milestone.label}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {/* Step number */}
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            milestone.paid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{milestone.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {milestone.description}
                          </div>
                          {milestone.paid && milestone.paidAt && (
                            <div className="text-xs text-green-600 mt-0.5">
                              Paid {formatDateTime(milestone.paidAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {formatGBP(milestone.amount)}
                        </div>
                        {milestone.paid ? (
                          <div className="text-sm text-green-600 flex items-center gap-1 justify-end">
                            <CheckCircle className="h-3 w-3" />
                            Paid
                          </div>
                        ) : (
                          <div className="text-sm text-amber-600 flex items-center gap-1 justify-end">
                            <XCircle className="h-3 w-3" />
                            Unpaid
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {milestones.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No payment schedule defined
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contract.status === 'draft' && (
                <Button variant="default">
                  <Send className="mr-2 h-4 w-4" />
                  Send to Client
                </Button>
              )}

              {contract.currentVersion?.storage_path && (
                <Button
                  variant="outline"
                  onClick={() =>
                    handleDownloadPDF(
                      contract.currentVersion!.storage_path,
                      contract.currentVersion!.version
                    )
                  }
                  disabled={
                    downloadingVersion === contract.currentVersion.version
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloadingVersion === contract.currentVersion.version
                    ? 'Loading...'
                    : 'Download PDF'}
                </Button>
              )}

              {shareableUrl && (
                <Button variant="outline" onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copySuccess ? 'Copied!' : 'Copy Signing Link'}
                </Button>
              )}

              {!['terminated', 'fulfilled'].includes(contract.status) && (
                <>
                  <Button variant="outline">
                    <FileEdit className="mr-2 h-4 w-4" />
                    Create Amendment
                  </Button>

                  <Button variant="destructive">
                    <Ban className="mr-2 h-4 w-4" />
                    Terminate
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right sidebar */}
      <div className="space-y-6">
        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {contract.events && contract.events.length > 0 ? (
              <div className="space-y-4">
                {contract.events.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="mt-1">{getEventIcon(event.event_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatEventDescription(
                          event.event_type,
                          (event.event_data || {}) as Record<string, unknown>
                        )}
                      </div>
                      {event.actor_id && (
                        <div className="text-xs text-muted-foreground mt-0.5 italic">
                          by Admin
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No events yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version History */}
        <Card>
          <CardHeader>
            <CardTitle>Version History</CardTitle>
          </CardHeader>
          <CardContent>
            {contract.versions && contract.versions.length > 0 ? (
              <div className="space-y-3">
                {contract.versions.map((version) => {
                  // Derive version status from signed_at (ContractVersion has no status field)
                  const versionStatus = version.signed_at ? 'signed' : 'draft';
                  return (
                    <div key={version.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            Version {version.version}
                          </div>
                          <Badge
                            variant={
                              versionStatus === 'signed'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {versionStatus}
                          </Badge>
                        </div>
                        {version.signed_at && (
                          <div className="text-xs text-green-600 flex items-center gap-1 shrink-0">
                            <CheckCircle className="h-3 w-3" />
                            Signed
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(version.generated_at)}
                      </div>
                      {version.changes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {version.changes}
                        </div>
                      )}
                      {version.storage_path && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 mt-1"
                          onClick={() =>
                            handleDownloadPDF(
                              version.storage_path,
                              version.version
                            )
                          }
                          disabled={downloadingVersion === version.version}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          {downloadingVersion === version.version
                            ? 'Loading...'
                            : 'Download'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No versions yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature */}
        {contract.currentVersion?.signed_at && (
          <Card>
            <CardHeader>
              <CardTitle>Signature</CardTitle>
            </CardHeader>
            <CardContent>
              {contract.currentVersion.client_signature_data && (
                <div className="border rounded p-2 mb-3 bg-white">
                  <Image
                    src={contract.currentVersion.client_signature_data}
                    alt="Client signature"
                    width={200}
                    height={60}
                    className="mx-auto"
                  />
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Signed by:</span>{' '}
                  {contract.currentVersion.client_signed_name}
                </div>
                <div>
                  <span className="font-medium">Email:</span>{' '}
                  {contract.currentVersion.signed_by_email}
                </div>
                <div>
                  <span className="font-medium">Date:</span>{' '}
                  <span suppressHydrationWarning>
                    {formatDateTime(contract.currentVersion.signed_at)}
                  </span>
                </div>
                {contract.currentVersion.signed_by_ip && (
                  <div className="text-xs text-muted-foreground">
                    IP: {contract.currentVersion.signed_by_ip}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
