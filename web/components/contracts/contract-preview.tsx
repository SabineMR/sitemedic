'use client';

/**
 * Contract Preview Component
 *
 * Renders a simplified HTML preview of what the PDF contract will look like.
 * Shows draft watermark and all key contract sections.
 */

import { Skeleton } from '@/components/ui/skeleton';
import type { ContractData } from '@/lib/contracts/types';
import { formatGBP } from '@/lib/contracts/payment-schedules';

interface ContractPreviewProps {
  contractData: Partial<ContractData>;
  isLoading?: boolean;
}

export function ContractPreview({
  contractData,
  isLoading = false,
}: ContractPreviewProps) {
  if (isLoading) {
    return <ContractPreviewSkeleton />;
  }

  return (
    <div className="relative border rounded-lg bg-white shadow-sm max-w-3xl mx-auto">
      {/* Draft watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="text-8xl font-bold text-gray-200 opacity-30 select-none"
          style={{
            transform: 'rotate(-45deg)',
            userSelect: 'none',
          }}
        >
          DRAFT
        </div>
      </div>

      {/* Preview content */}
      <div className="relative p-8 space-y-6 prose prose-sm max-w-none">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold mb-1">SERVICE AGREEMENT PREVIEW</h1>
          <p className="text-sm text-muted-foreground">
            {contractData.contractNumber || 'CON-XXXX-XXX'}
          </p>
          {contractData.generatedDate && (
            <p className="text-xs text-muted-foreground">
              Generated: {new Date(contractData.generatedDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Provider</h2>
            <div className="text-sm space-y-1">
              <p className="font-medium">SiteMedic Ltd</p>
              <p className="text-muted-foreground">123 Business Park</p>
              <p className="text-muted-foreground">London, UK</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Client</h2>
            <div className="text-sm space-y-1">
              <p className="font-medium">{contractData.clientName || 'Client Name'}</p>
              {contractData.clientAddress && (
                <p className="text-muted-foreground whitespace-pre-line">
                  {contractData.clientAddress}
                </p>
              )}
              {contractData.clientEmail && (
                <p className="text-muted-foreground">{contractData.clientEmail}</p>
              )}
              {contractData.clientPhone && (
                <p className="text-muted-foreground">{contractData.clientPhone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Site Details */}
        {contractData.siteAddress && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Site Details</h2>
            <div className="text-sm space-y-1 bg-accent/20 p-3 rounded">
              <p>
                <span className="font-medium">Location:</span> {contractData.siteAddress}
              </p>
              {contractData.serviceType && (
                <p>
                  <span className="font-medium">Service:</span> {contractData.serviceType}
                </p>
              )}
              {contractData.scheduledDate && (
                <p>
                  <span className="font-medium">Scheduled:</span>{' '}
                  {new Date(contractData.scheduledDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
              {contractData.estimatedDuration && (
                <p>
                  <span className="font-medium">Duration:</span> {contractData.estimatedDuration}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pricing Table */}
        {contractData.totalPrice !== undefined && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Pricing</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Subtotal</td>
                  <td className="text-right">
                    {contractData.subtotal !== undefined
                      ? formatGBP(contractData.subtotal)
                      : '—'}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">VAT (20%)</td>
                  <td className="text-right">
                    {contractData.vatAmount !== undefined
                      ? formatGBP(contractData.vatAmount)
                      : '—'}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  <td className="text-right">{formatGBP(contractData.totalPrice)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Schedule */}
        {contractData.paymentSchedule && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Payment Schedule</h2>
            <div className="text-sm bg-accent/20 p-4 rounded space-y-2">
              <p className="font-medium mb-3">{contractData.paymentSchedule.description}</p>

              <table className="w-full">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">Milestone</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {contractData.paymentSchedule.upfrontAmount > 0 && (
                    <tr className="border-b">
                      <td className="py-2">Upon Contract Signing</td>
                      <td className="text-right font-medium">
                        {formatGBP(contractData.paymentSchedule.upfrontAmount)}
                      </td>
                    </tr>
                  )}
                  {contractData.paymentSchedule.completionAmount > 0 && (
                    <tr className="border-b">
                      <td className="py-2">Upon Service Completion</td>
                      <td className="text-right font-medium">
                        {formatGBP(contractData.paymentSchedule.completionAmount)}
                      </td>
                    </tr>
                  )}
                  {contractData.paymentSchedule.net30Amount > 0 && (
                    <tr className="border-b">
                      <td className="py-2">Net 30 Days After Completion</td>
                      <td className="text-right font-medium">
                        {formatGBP(contractData.paymentSchedule.net30Amount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Clauses Preview */}
        {contractData.clauses && contractData.clauses.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Contract Clauses</h2>
            <div className="text-xs text-muted-foreground space-y-2">
              {contractData.clauses.slice(0, 3).map((clause: any, idx: number) => (
                <div key={idx} className="border-l-2 pl-3">
                  <p className="font-medium">{clause.title}</p>
                  <p className="line-clamp-2">{clause.body}</p>
                </div>
              ))}
              {contractData.clauses.length > 3 && (
                <p className="text-muted-foreground italic">
                  + {contractData.clauses.length - 3} more clauses...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Terms & Conditions Preview */}
        {contractData.termsAndConditions && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Terms & Conditions</h2>
            <div className="text-xs text-muted-foreground bg-accent/10 p-3 rounded">
              <p className="line-clamp-3">{contractData.termsAndConditions}</p>
              <p className="text-muted-foreground italic mt-1">
                (Full terms will appear in final PDF)
              </p>
            </div>
          </div>
        )}

        {/* Signature Block */}
        <div className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">Signatures</h2>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Client Signature</p>
              <div className="border-b border-dashed pb-8 text-muted-foreground">
                {contractData.signedByName || '(Awaiting signature)'}
              </div>
              <p className="text-xs text-muted-foreground">
                Date: {contractData.signedAt
                  ? new Date(contractData.signedAt).toLocaleDateString('en-GB')
                  : '__________'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Provider Signature</p>
              <div className="border-b border-dashed pb-8 text-muted-foreground">
                SiteMedic Ltd
              </div>
              <p className="text-xs text-muted-foreground">
                Date: {contractData.generatedDate
                  ? new Date(contractData.generatedDate).toLocaleDateString('en-GB')
                  : '__________'}
              </p>
            </div>
          </div>
        </div>

        {/* Digital Signature Disclaimer */}
        {contractData.requiresSignature && (
          <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 p-3 rounded">
            <p className="font-medium mb-1">Digital Signature Notice</p>
            <p>
              This contract will be signed electronically using a secure digital signature
              platform. Electronic signatures are legally binding under the UK Electronic
              Communications Act 2000.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for contract preview
 */
function ContractPreviewSkeleton() {
  return (
    <div className="border rounded-lg bg-white shadow-sm max-w-3xl mx-auto p-8 space-y-6">
      <div className="text-center border-b pb-4 space-y-2">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
