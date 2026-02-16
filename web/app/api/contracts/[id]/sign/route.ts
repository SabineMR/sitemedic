import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/contracts/[id]/sign
 *
 * Handles contract signature submission.
 * Updates contract_versions with signature data and audit trail.
 * Updates contract status to 'signed'.
 * Triggers PDF regeneration with embedded signature.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await context.params;
    const body = await request.json();
    const { signatureDataUrl, signedName } = body;

    if (!signatureDataUrl || !signedName) {
      return NextResponse.json(
        { error: 'Missing signature data' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch contract with current version
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(
        `
        *,
        currentVersion:contract_versions!contracts_current_version_id_fkey (
          id,
          version
        ),
        client:clients!contracts_client_id_fkey (
          email
        )
      `
      )
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Validate contract is in correct status
    if (contract.status !== 'sent' && contract.status !== 'viewed') {
      return NextResponse.json(
        {
          error: `Cannot sign contract in status: ${contract.status}. Contract must be 'sent' or 'viewed'.`,
        },
        { status: 400 }
      );
    }

    // Extract IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Extract user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const now = new Date().toISOString();

    // Get current version details
    const currentVersion = Array.isArray(contract.currentVersion)
      ? contract.currentVersion[0]
      : contract.currentVersion;

    // Update current contract_version with signature data
    const { error: versionError } = await supabase
      .from('contract_versions')
      .update({
        client_signature_data: signatureDataUrl,
        client_signed_name: signedName,
        signed_at: now,
        signed_by_email: Array.isArray(contract.client)
          ? contract.client[0]?.email
          : contract.client?.email,
        signed_by_ip: ipAddress,
      })
      .eq('id', currentVersion?.id);

    if (versionError) {
      console.error('Error updating contract version:', versionError);
      return NextResponse.json(
        { error: 'Failed to save signature data' },
        { status: 500 }
      );
    }

    // Update contract status to 'signed'
    const { error: contractUpdateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: now,
      })
      .eq('id', contractId);

    if (contractUpdateError) {
      console.error('Error updating contract status:', contractUpdateError);
      return NextResponse.json(
        { error: 'Failed to update contract status' },
        { status: 500 }
      );
    }

    // Log contract event with audit trail
    await supabase.from('contract_events').insert({
      contract_id: contractId,
      event_type: 'signature_captured',
      event_data: {
        signedName,
        ipAddress,
        userAgent,
        signedAt: now,
      },
      actor_ip: ipAddress,
      created_at: now,
    });

    // Trigger PDF regeneration with signature embedded
    // Call the Edge Function to generate the signed PDF
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke(
      'generate-contract-pdf',
      {
        body: { contractId },
      }
    );

    if (pdfError) {
      console.error('Error generating signed PDF:', pdfError);
      // Don't fail the request - signature is saved, PDF can be regenerated later
    } else if (pdfData) {
      // Upload PDF to storage
      const versionNumber = currentVersion?.version || 1;
      const nextVersion = versionNumber + 1;
      const storagePath = `${contractId}/v${nextVersion}.pdf`;

      // Convert the PDF data to Uint8Array if needed
      const pdfBuffer =
        typeof pdfData === 'string'
          ? new Uint8Array(Buffer.from(pdfData, 'base64'))
          : new Uint8Array(pdfData);

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading signed PDF:', uploadError);
      } else {
        // Create new contract version record
        const { data: newVersion } = await supabase
          .from('contract_versions')
          .insert({
            contract_id: contractId,
            version: nextVersion,
            storage_path: storagePath,
            generated_at: now,
            changes: 'Signed by client',
            previous_version_id: currentVersion?.id,
          })
          .select()
          .single();

        // Update contract to point to new version
        if (newVersion) {
          await supabase
            .from('contracts')
            .update({
              current_version_id: newVersion.id,
            })
            .eq('id', contractId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in contract signing API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
