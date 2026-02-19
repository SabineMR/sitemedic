import { createClient } from '@/lib/supabase/server';
import { ContractViewer } from '@/components/contracts/contract-viewer';
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge';
import type { ContractWithRelations } from '@/lib/contracts/types';
import { SignatureSection } from './signature-section';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Public Contract Signing Page
 *
 * Accessible via shareable token (no auth required).
 * Allows clients to view agreement and sign digitally.
 * Updates status to 'viewed' on first load if currently 'sent'.
 */
export default async function ContractSigningPage({ params }: PageProps) {
  const { id: shareableToken } = await params;
  const supabase = await createClient();

  // Fetch contract by shareable token with all relations
  const { data: contract, error } = await supabase
    .from('contracts')
    .select(
      `
      *,
      booking:bookings!contracts_booking_id_fkey (
        id,
        site_name,
        event_vertical,
        shift_date,
        total,
        subtotal,
        vat,
        site_address,
        site_postcode
      ),
      client:clients!contracts_client_id_fkey (
        id,
        company_name,
        contact_email,
        contact_phone,
        payment_terms
      ),
      template:contract_templates!contracts_template_id_fkey (
        id,
        name,
        clauses,
        terms_and_conditions,
        cancellation_policy
      ),
      currentVersion:contract_versions!contracts_current_version_id_fkey (
        id,
        version,
        storage_path,
        client_signature_data,
        client_signed_name,
        signed_at,
        signed_by_email,
        signed_by_ip
      )
    `
    )
    .eq('shareable_token', shareableToken)
    .single();

  // Handle not found
  if (error || !contract) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Alert variant="destructive" className="max-w-md">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Contract Not Found</AlertTitle>
          <AlertDescription>
            This contract link is invalid or has expired. Please contact SiteMedic
            support if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle terminated contracts
  if (contract.status === 'terminated') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Alert variant="destructive" className="max-w-md">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Contract Cancelled</AlertTitle>
          <AlertDescription>
            This agreement has been cancelled.
            {contract.termination_reason && (
              <p className="mt-2">Reason: {contract.termination_reason}</p>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Update status to 'viewed' if currently 'sent'
  if (contract.status === 'sent') {
    // Update contract status
    await supabase
      .from('contracts')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', contract.id);

    // Log contract event
    await supabase.from('contract_events').insert({
      contract_id: contract.id,
      event_type: 'status_change',
      event_data: {
        from: 'sent',
        to: 'viewed',
        viewed_via: 'signing_page',
      },
      created_at: new Date().toISOString(),
    });

    // Update local contract object for rendering
    contract.status = 'viewed';
    contract.viewed_at = new Date().toISOString();
  }

  const contractWithRelations: ContractWithRelations = {
    ...contract,
    booking: Array.isArray(contract.booking)
      ? contract.booking[0]
      : contract.booking,
    client: Array.isArray(contract.client) ? contract.client[0] : contract.client,
    template: Array.isArray(contract.template)
      ? contract.template[0]
      : contract.template,
    currentVersion: Array.isArray(contract.currentVersion)
      ? contract.currentVersion[0]
      : contract.currentVersion,
  };

  // Handle already signed contracts
  const isSigned = contract.status === 'signed' || contract.signed_at;

  return (
    <div className="space-y-8">
      {/* Status Banner */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Contract Review & Signature
            </h2>
            <p className="text-slate-600 mt-1">
              Please review the agreement carefully before signing
            </p>
          </div>
          <ContractStatusBadge status={contract.status} />
        </div>
      </div>

      {/* Success message for signed contracts */}
      {isSigned && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Agreement Signed</AlertTitle>
          <AlertDescription className="text-green-800">
            This agreement has been signed successfully on{' '}
            {contract.signed_at &&
              new Date(contract.signed_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            . A copy has been sent to your email.
          </AlertDescription>
        </Alert>
      )}

      {/* Contract Viewer */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <ContractViewer contract={contractWithRelations} />
      </div>

      {/* Signature Section (only for unsigned contracts) */}
      {!isSigned && (contract.status === 'sent' || contract.status === 'viewed') && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Sign Agreement
          </h3>
          <SignatureSection contractId={contract.id} />
        </div>
      )}
    </div>
  );
}
