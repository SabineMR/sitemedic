import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { resend } from '@/lib/email/resend';

interface GenerateInvoiceRequest {
  clientId: string;
  bookingIds: string[];
  invoiceDate?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    const body: GenerateInvoiceRequest = await req.json();
    const { clientId, bookingIds, invoiceDate } = body;

    // Validate inputs
    if (!clientId || !bookingIds || bookingIds.length === 0) {
      return NextResponse.json(
        { error: 'clientId and bookingIds are required' },
        { status: 400 }
      );
    }

    // Fetch client details
    // CRITICAL: Filter by org_id to prevent cross-org invoicing
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('org_id', orgId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch bookings
    // CRITICAL: Filter by org_id to prevent cross-org booking inclusion
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .in('id', bookingIds)
      .eq('org_id', orgId);

    if (bookingsError || !bookings || bookings.length === 0) {
      return NextResponse.json({ error: 'Bookings not found' }, { status: 404 });
    }

    // Validate bookings
    for (const booking of bookings) {
      // Double-check org_id matches (RLS should enforce this, but validate explicitly)
      if (booking.org_id !== orgId) {
        return NextResponse.json(
          { error: `Security violation: Booking ${booking.id} belongs to different organization` },
          { status: 403 }
        );
      }

      if (booking.client_id !== clientId) {
        return NextResponse.json(
          { error: `Booking ${booking.id} does not belong to client ${clientId}` },
          { status: 400 }
        );
      }

      if (booking.status !== 'completed') {
        return NextResponse.json(
          { error: `Booking ${booking.id} is not completed (status: ${booking.status})` },
          { status: 400 }
        );
      }
    }

    // Check if any bookings already invoiced
    // IMPORTANT: Filter by org_id for consistency
    const { data: existingLineItems } = await supabase
      .from('invoice_line_items')
      .select('booking_id')
      .in('booking_id', bookingIds)
      .eq('org_id', orgId);

    if (existingLineItems && existingLineItems.length > 0) {
      const alreadyInvoiced = existingLineItems.map((item) => item.booking_id);
      return NextResponse.json(
        { error: `Bookings already invoiced: ${alreadyInvoiced.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    for (const booking of bookings) {
      // Total is already inclusive of VAT, so we need to extract the pre-VAT amount
      const preVatAmount = booking.total_amount / 1.2;
      subtotal += preVatAmount;
    }

    const vat = subtotal * 0.2;
    const total = subtotal + vat;

    // Generate invoice number (using sequence)
    const { data: seqData, error: seqError } = await supabase.rpc('get_next_invoice_number');

    if (seqError) {
      console.error('Error generating invoice number:', seqError);
      return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 });
    }

    const invoiceNumber = seqData || `INV-${new Date().getFullYear()}-${Date.now()}`;

    // Set invoice date and due date
    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const dueDate = new Date(invDate);
    dueDate.setDate(dueDate.getDate() + 30); // Net 30

    // Insert invoice record
    // CRITICAL: Set org_id to ensure invoice belongs to current org
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        org_id: orgId,
        invoice_number: invoiceNumber,
        client_id: clientId,
        subtotal: Number(subtotal.toFixed(2)),
        vat: Number(vat.toFixed(2)),
        total: Number(total.toFixed(2)),
        invoice_date: invDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        payment_terms: client.payment_terms || 'net_30',
        status: 'draft',
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Insert line items
    // CRITICAL: Set org_id on all line items
    const lineItems = bookings.map((booking) => ({
      org_id: orgId,
      invoice_id: invoice.id,
      booking_id: booking.id,
      description: `Medic service - ${booking.site_name} on ${new Date(booking.shift_date).toLocaleDateString('en-GB')}`,
      quantity: booking.shift_hours,
      unit_price: Number((booking.total_amount / booking.shift_hours).toFixed(2)),
      amount: Number(booking.total_amount.toFixed(2)),
    }));

    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItems);

    if (lineItemsError) {
      console.error('Error creating line items:', lineItemsError);
      // Rollback invoice (with org_id filter for safety)
      await supabase.from('invoices').delete().eq('id', invoice.id).eq('org_id', orgId);
      return NextResponse.json({ error: 'Failed to create invoice line items' }, { status: 500 });
    }

    // Generate PDF
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoiceId: invoice.id },
    });

    if (pdfError) {
      console.error('Error generating PDF:', pdfError);
    }

    // Send invoice email to client via Resend
    const invoiceDateFormatted = new Date(invoice.invoice_date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const dueDateFormatted = new Date(invoice.due_date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const totalFormatted = new Intl.NumberFormat('en-GB', {
      style: 'currency', currency: 'GBP',
    }).format(invoice.total);

    const emailResult = await resend.emails.send({
      from: 'invoices@sitemedic.co.uk',
      to: client.email,
      subject: `Invoice ${invoice.invoice_number} from SiteMedic — ${totalFormatted}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">
          <div style="background:#1e40af;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px">SiteMedic Invoice</h1>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px">
            <p style="margin-top:0">Dear ${client.name},</p>
            <p>Please find your invoice details below.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <tr style="background:#f9fafb">
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold">Invoice Number</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold">Invoice Date</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb">${invoiceDateFormatted}</td>
              </tr>
              <tr style="background:#f9fafb">
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold">Payment Due</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb">${dueDateFormatted}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold">Total Due</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:18px;color:#1e40af;font-weight:bold">${totalFormatted}</td>
              </tr>
            </table>
            ${pdfData?.pdf_url ? `<p><a href="${pdfData.pdf_url}" style="background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Download PDF Invoice</a></p>` : ''}
            <p style="color:#6b7280;font-size:13px;margin-top:24px">
              For payment queries, please contact <a href="mailto:accounts@sitemedic.co.uk">accounts@sitemedic.co.uk</a>
            </p>
          </div>
        </div>
      `,
    });

    if (emailResult.error) {
      console.error('Invoice email failed:', emailResult.error);
      // Non-fatal — invoice is still created
    }

    return NextResponse.json({
      invoice,
      pdf_url: pdfData?.pdf_url,
    });
  } catch (error) {
    console.error('Error in invoice generation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
