'use client';

import * as React from 'react';
import { ContractWithRelations } from '@/lib/contracts/types';
import { formatContractNumber } from '@/lib/contracts/utils';
import { ContractStatusBadge } from './contract-status-badge';
import { Button } from '@/components/ui/button';
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

interface ContractDetailProps {
  contract: ContractWithRelations;
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

  // Get PDF download URL (from current version)
  const pdfUrl = contract.currentVersion?.storage_path
    ? `/api/contracts/${contract.id}/pdf`
    : null;

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
                <div className="font-medium">{contract.client?.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Contact Email
                </div>
                <div className="font-medium">{contract.client?.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Phone
                </div>
                <div className="font-medium">
                  {contract.client?.phone || 'N/A'}
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
                  {contract.booking?.address_line1}
                  {contract.booking?.address_line2 && (
                    <>, {contract.booking.address_line2}</>
                  )}
                  <br />
                  {contract.booking?.city}, {contract.booking?.postcode}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Service Date
                </div>
                <div className="font-medium">
                  {contract.booking?.scheduled_date
                    ? formatDate(contract.booking.scheduled_date)
                    : 'Not scheduled'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Service Type
                </div>
                <div className="font-medium">
                  {contract.booking?.service_type}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Total Price
                </div>
                <div className="font-medium text-lg">
                  {formatGBP(contract.booking?.total_price || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contract.upfront_amount > 0 && (
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-medium">Upfront Payment</div>
                    <div className="text-sm text-muted-foreground">
                      Due before service
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatGBP(contract.upfront_amount)}
                    </div>
                    {contract.upfront_paid_at ? (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Unpaid
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contract.completion_amount > 0 && (
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-medium">Completion Payment</div>
                    <div className="text-sm text-muted-foreground">
                      Due on completion
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatGBP(contract.completion_amount)}
                    </div>
                    {contract.completion_paid_at ? (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Unpaid
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contract.net30_amount > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Net 30 Payment</div>
                    <div className="text-sm text-muted-foreground">
                      Due 30 days after completion
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatGBP(contract.net30_amount)}
                    </div>
                    {contract.net30_paid_at ? (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Unpaid
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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

              {pdfUrl && (
                <Button variant="outline" asChild>
                  <a href={pdfUrl} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </a>
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
                      {event.event_data && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {JSON.stringify(event.event_data)}
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
                {contract.versions.map((version) => (
                  <div key={version.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Version {version.version}</div>
                      {version.signed_at && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
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
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-1"
                      asChild
                    >
                      <a
                        href={`/api/contracts/${contract.id}/pdf?version=${version.version}`}
                        download
                      >
                        Download
                      </a>
                    </Button>
                  </div>
                ))}
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
