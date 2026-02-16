/**
 * Contract PDF Generation Edge Function
 * Phase 4.6: Customer Onboarding & Contract Management - Plan 02
 *
 * Purpose: Generate service agreement PDFs with auto-filled booking data, pricing breakdowns,
 * payment terms, and signature blocks.
 *
 * Modes:
 * 1. contractId provided: Fetch contract + booking + client data from database, build ContractPDFData
 * 2. Full data provided: Use directly (for preview before saving)
 *
 * Authentication:
 * - Service role key from Supabase environment for database access
 * - CORS enabled for dashboard access
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import { ContractDocument } from './components/ContractDocument.tsx';
import { ContractPDFData } from './types.ts';

// CORS headers for dashboard access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate contract number in format: SA-{YYYY}-{NNN}
 * NNN is zero-padded sequential number derived from contract ID
 */
function generateContractNumber(contractId: string): string {
  const year = new Date().getFullYear();
  // Use last 3 characters of UUID as sequential-like number
  const sequence = parseInt(contractId.slice(-3), 16).toString().padStart(3, '0').slice(0, 3);
  return `SA-${year}-${sequence}`;
}

/**
 * Build ContractPDFData from database records
 */
async function buildContractData(
  supabase: ReturnType<typeof createClient>,
  contractId: string
): Promise<ContractPDFData> {
  // Fetch contract with relations
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select(
      `
      *,
      booking:bookings!booking_id(*),
      client:clients!client_id(*)
    `
    )
    .eq('id', contractId)
    .single();

  if (contractError) {
    throw new Error(`Contract not found: ${contractError.message}`);
  }

  if (!contract) {
    throw new Error('Contract not found');
  }

  // Fetch template (use contract's template or default)
  let template;
  if (contract.template_id) {
    const { data: templateData, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', contract.template_id)
      .single();

    if (templateError) {
      throw new Error(`Template not found: ${templateError.message}`);
    }
    template = templateData;
  } else {
    // Use default template
    const { data: defaultTemplate, error: defaultError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('is_default', true)
      .limit(1)
      .single();

    if (defaultError || !defaultTemplate) {
      throw new Error('No default template found');
    }
    template = defaultTemplate;
  }

  // Fetch signature if contract is signed
  let signature: ContractPDFData['signature'] | undefined;
  if (contract.current_version_id) {
    const { data: version } = await supabase
      .from('contract_versions')
      .select('client_signature_data, client_signed_name, signed_at, signed_by_email')
      .eq('id', contract.current_version_id)
      .single();

    if (version?.client_signature_data) {
      signature = {
        dataUrl: version.client_signature_data,
        signedName: version.client_signed_name || contract.client.contact_name,
        signedAt: version.signed_at || new Date().toISOString(),
        signedByEmail: version.signed_by_email || contract.client.contact_email,
      };
    }
  }

  // Build payment schedule description
  const paymentTermDescriptions: Record<string, string> = {
    full_prepay: 'Full payment required upon signing before service delivery.',
    split_50_50:
      '50% payment due upon signing, with the remaining 50% due immediately upon service completion.',
    split_50_net30:
      '50% payment due upon signing, with the remaining 50% due within 30 days after service completion.',
    full_net30: 'Full payment due within 30 days after service completion (Net 30 terms).',
    custom: contract.custom_terms_description || 'Custom payment terms as outlined above.',
  };

  // Build ContractPDFData
  const contractData: ContractPDFData = {
    contractId: contract.id,
    contractNumber: generateContractNumber(contract.id),
    generatedAt: new Date().toISOString(),

    client: {
      companyName: contract.client.company_name,
      contactName: contract.client.contact_name,
      contactEmail: contract.client.contact_email,
      address: contract.client.billing_address,
      postcode: contract.client.billing_postcode,
      vatNumber: contract.client.vat_number,
    },

    site: {
      name: contract.booking.site_name,
      address: contract.booking.site_address,
      postcode: contract.booking.site_postcode,
      contactName: contract.booking.site_contact_name,
      contactPhone: contract.booking.site_contact_phone,
    },

    booking: {
      shiftDate: contract.booking.shift_date,
      shiftStart: contract.booking.shift_start_time,
      shiftEnd: contract.booking.shift_end_time,
      hours: Number(contract.booking.shift_hours),
      specialRequirements: contract.booking.special_notes,
      isRecurring: contract.booking.is_recurring || false,
      recurrencePattern: contract.booking.recurrence_pattern,
      recurringUntil: contract.booking.recurring_until,
    },

    pricing: {
      baseRate: Number(contract.booking.base_rate),
      hours: Number(contract.booking.shift_hours),
      subtotal: Number(contract.booking.subtotal),
      urgencyPremiumPercent: contract.booking.urgency_premium_percent || 0,
      urgencyPremiumAmount:
        (Number(contract.booking.subtotal) * (contract.booking.urgency_premium_percent || 0)) /
        100,
      travelSurcharge: Number(contract.booking.travel_surcharge) || 0,
      outOfTerritoryCost: Number(contract.booking.out_of_territory_cost) || 0,
      netAmount: Number(contract.booking.subtotal) + Number(contract.booking.travel_surcharge || 0) + Number(contract.booking.out_of_territory_cost || 0),
      vat: Number(contract.booking.vat),
      total: Number(contract.booking.total),
    },

    paymentSchedule: {
      terms: contract.payment_terms,
      description: paymentTermDescriptions[contract.payment_terms] || '',
      upfrontAmount: Number(contract.upfront_amount) || 0,
      completionAmount: Number(contract.completion_amount) || 0,
      net30Amount: Number(contract.net30_amount) || 0,
    },

    template: {
      clauses: template.clauses || [],
      termsAndConditions: template.terms_and_conditions,
      cancellationPolicy: template.cancellation_policy,
    },

    signature,
  };

  return contractData;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('📄 Starting contract PDF generation...');

    // Parse request body
    const body = await req.json();
    const { contractId, data: previewData } = body;

    // Determine mode: database lookup or preview
    let contractData: ContractPDFData;

    if (contractId) {
      // Mode 1: Fetch from database
      console.log(`🔍 Fetching contract data for ID: ${contractId}`);
      contractData = await buildContractData(supabase, contractId);
    } else if (previewData) {
      // Mode 2: Use provided preview data
      console.log('📝 Using preview data for PDF generation');
      contractData = previewData;
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing contractId or data in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate PDF buffer using React-PDF
    console.log('📝 Rendering PDF...');
    const pdfBuffer = await renderToBuffer(<ContractDocument data={contractData} />);

    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);

    const duration = Date.now() - startTime;
    console.log(`✅ Contract PDF generated in ${duration}ms`);

    // Return PDF buffer for direct download
    const fileName = `service-agreement-${contractData.contractNumber}.pdf`;
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Generation-Time': `${duration}ms`,
      },
    });
  } catch (error) {
    console.error('❌ Error generating contract PDF:', error);

    // Determine error status
    let status = 500;
    let message = 'Failed to generate contract PDF';

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        status = 404;
      } else if (error.message.includes('Missing')) {
        status = 400;
      }
      message = error.message;
    }

    return new Response(
      JSON.stringify({
        error: message,
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
