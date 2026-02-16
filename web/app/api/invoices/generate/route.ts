import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface GenerateInvoiceRequest {
  clientId: string;
  bookingIds: string[];
  invoiceDate?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

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
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .in('id', bookingIds);

    if (bookingsError || !bookings || bookings.length === 0) {
      return NextResponse.json({ error: 'Bookings not found' }, { status: 404 });
    }

    // Validate bookings
    for (const booking of bookings) {
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
    const { data: existingLineItems } = await supabase
      .from('invoice_line_items')
      .select('booking_id')
      .in('booking_id', bookingIds);

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
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
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
    const lineItems = bookings.map((booking) => ({
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
      // Rollback invoice
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return NextResponse.json({ error: 'Failed to create invoice line items' }, { status: 500 });
    }

    // Generate PDF
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoiceId: invoice.id },
    });

    if (pdfError) {
      console.error('Error generating PDF:', pdfError);
    }

    // TODO: Send invoice email to client via Resend

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
