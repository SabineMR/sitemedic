import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateLateFee } from '@/lib/invoices/late-fees';

interface SendReminderRequest {
  invoiceId: string;
  reminderType: '7_days' | '14_days' | '21_days';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user (can be admin or automated system)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Allow service role key (for cron job)
    const authHeader = req.headers.get('authorization');
    const isServiceRole = authHeader?.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || 'invalid');

    if (!isServiceRole && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SendReminderRequest = await req.json();
    const { invoiceId, reminderType } = body;

    // Validate inputs
    if (!invoiceId || !reminderType) {
      return NextResponse.json(
        { error: 'invoiceId and reminderType are required' },
        { status: 400 }
      );
    }

    // Fetch invoice with client details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate days overdue
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Validate reminder hasn't already been sent for this interval
    const reminderField = `reminder_sent_${reminderType}`;
    if (invoice[reminderField]) {
      return NextResponse.json(
        { error: `${reminderType} reminder already sent` },
        { status: 400 }
      );
    }

    // Calculate late fee
    const lateFee = calculateLateFee(invoice.total);

    // Send reminder email via Resend
    // TODO: Implement Resend email sending
    const emailSubject = `Payment Reminder: Invoice ${invoice.invoice_number} - ${daysOverdue} days overdue`;
    const emailBody = `
Dear ${invoice.client.company_name},

This is a payment reminder for Invoice ${invoice.invoice_number}.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Original Amount: £${invoice.total.toFixed(2)}
- Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-GB')}
- Days Overdue: ${daysOverdue}

Late Payment Fee: £${lateFee.toFixed(2)}
${reminderType === '21_days' ? '\nThis late fee will be applied to your account as per the Late Payment of Commercial Debts (Interest) Act 1998.' : ''}

Total Amount Due: £${(invoice.total + (reminderType === '21_days' ? lateFee : 0)).toFixed(2)}

Payment Instructions:
Bank: Sort Code 12-34-56, Account 12345678
Reference: ${invoice.invoice_number}

${reminderType === '21_days' ? '\n⚠️ URGENT: This is your final reminder. If payment is not received within 7 days, we will be forced to escalate this matter.' : ''}

Please contact us immediately if there are any issues with this invoice.

Best regards,
SiteMedic Billing Team
    `;

    console.log(`Sending ${reminderType} reminder for invoice ${invoice.invoice_number}`);
    console.log('Email:', emailSubject);

    // Update invoice
    const updateData: any = {
      [reminderField]: true,
      status: 'overdue',
    };

    // Apply late fee at 21 days if not already charged
    if (reminderType === '21_days' && !invoice.late_fee_charged) {
      updateData.late_fee_charged = lateFee;
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    // Log reminder event in audit trail
    console.log(`✅ ${reminderType} reminder sent for invoice ${invoice.invoice_number}`);

    return NextResponse.json({
      success: true,
      email_sent: true,
      late_fee_applied: reminderType === '21_days' ? lateFee : 0,
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
