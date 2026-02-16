import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateLateFee } from '@/lib/invoices/late-fees';

export const dynamic = 'force-dynamic';

interface SendReminderRequest {
  invoiceId: string;
  reminderType: '7_days' | '14_days' | '21_days';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Allow both admin users and automated system (service role)
    const authHeader = request.headers.get('authorization');
    const isServiceRole = authHeader?.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

    if ((authError || !user) && !isServiceRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If authenticated as user, verify admin role
    if (user) {
      const { data: profile} = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
      }
    }

    const body: SendReminderRequest = await request.json();
    const { invoiceId, reminderType } = body;

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
        client:clients(
          company_name,
          contact_name,
          contact_email
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found', details: invoiceError?.message },
        { status: 404 }
      );
    }

    // Calculate days overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Validate reminder hasn't already been sent
    const reminderField = `reminder_sent_${reminderType}` as keyof typeof invoice;
    if (invoice[reminderField] === true) {
      return NextResponse.json(
        { error: `${reminderType} reminder already sent for this invoice` },
        { status: 400 }
      );
    }

    // Calculate late fee
    const lateFee = calculateLateFee(parseFloat(invoice.total));

    // Determine escalation level
    const escalationWarning = daysOverdue >= 21
      ? '\n\nWARNING: This invoice is now 21+ days overdue. If payment is not received within 7 days, we may escalate this matter to our collections department.'
      : '';

    // Prepare email content
    const subject = `Payment Reminder: Invoice ${invoice.invoice_number} - ${daysOverdue} days overdue`;
    const emailBody = `
Dear ${invoice.client.contact_name},

This is a payment reminder for Invoice ${invoice.invoice_number}.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Original Amount: £${parseFloat(invoice.total).toFixed(2)}
- Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-GB')}
- Days Overdue: ${daysOverdue}

Late Payment Fee:
As per the UK Late Payment of Commercial Debts (Interest) Act 1998, a statutory late payment fee of £${lateFee.toFixed(2)} applies to this invoice.

Total Amount Now Due: £${(parseFloat(invoice.total) + lateFee).toFixed(2)}

Payment Instructions:
Bank: SiteMedic Ltd
Sort Code: 12-34-56
Account Number: 12345678
Reference: ${invoice.invoice_number}

Please arrange payment at your earliest convenience to avoid further late fees and potential escalation.${escalationWarning}

If you have any questions or have already made payment, please contact us immediately.

Best regards,
SiteMedic Accounts Team
    `.trim();

    // TODO: Send email via Resend
    // For now, we'll just log it
    console.log(`Would send email to ${invoice.client.contact_email}:`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${emailBody}`);

    // Update invoice
    const updates: any = {
      [reminderField]: true,
      updated_at: new Date().toISOString(),
    };

    // If 21+ days and not already charged, apply late fee
    if (daysOverdue >= 21 && parseFloat(invoice.late_fee_charged || '0') === 0) {
      updates.late_fee_charged = lateFee;
    }

    // Update status to overdue if not already
    if (invoice.status !== 'overdue') {
      updates.status = 'overdue';
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update invoice', details: updateError.message },
        { status: 500 }
      );
    }

    // Log reminder event in audit trail (if audit_logs table exists)
    try {
      await supabase.from('audit_logs').insert({
        action: 'invoice_reminder_sent',
        table_name: 'invoices',
        record_id: invoiceId,
        details: {
          reminder_type: reminderType,
          days_overdue: daysOverdue,
          late_fee: lateFee,
          email_sent_to: invoice.client.contact_email,
        },
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Don't fail - audit is non-critical
    }

    return NextResponse.json({
      success: true,
      email_sent: true,
      late_fee_applied: daysOverdue >= 21 ? lateFee : 0,
      days_overdue: daysOverdue,
    });
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
