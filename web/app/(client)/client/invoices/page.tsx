/**
 * Client Invoices Page
 *
 * Displays invoices from the invoices table with real status,
 * invoice numbers, due dates, and PDF download links.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRequireOrg } from '@/contexts/org-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, AlertCircle } from 'lucide-react';

interface ClientInvoice {
  id: string;
  invoice_number: string;
  subtotal: number;
  vat: number;
  total: number;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  pdf_url: string | null;
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-800' },
  sent: { label: 'Awaiting Payment', className: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
};

async function fetchClientInvoices(orgId: string): Promise<ClientInvoice[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Find the client record linked to this user
  const { data: clientRecord, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single();

  if (clientError || !clientRecord) return [];

  // Query actual invoices table
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      id,
      invoice_number,
      subtotal,
      vat,
      total,
      invoice_date,
      due_date,
      status,
      paid_at,
      pdf_url
    `
    )
    .eq('client_id', clientRecord.id)
    .eq('org_id', orgId)
    .neq('status', 'draft')
    .order('invoice_date', { ascending: false });

  if (error) throw error;

  return (data as ClientInvoice[]) || [];
}

export default function ClientInvoicesPage() {
  const orgId = useRequireOrg();

  const {
    data: invoices,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['client-invoices', orgId],
    queryFn: () => fetchClientInvoices(orgId),
    refetchInterval: 60_000,
  });

  const formatGBP = (amount: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading invoices...</span>
      </div>
    );
  }

  const invoiceList = invoices || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">
          View and download your invoices
        </p>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <p className="text-red-700">Failed to load invoices.</p>
          </CardContent>
        </Card>
      ) : invoiceList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
            <p className="text-sm text-muted-foreground">
              Invoices will appear here once they have been issued.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoiceList.map((invoice) => {
            const status = statusConfig[invoice.status] || statusConfig.draft;

            return (
              <Card key={invoice.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{invoice.invoice_number}</span>
                        <Badge variant="secondary" className={status.className}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Issued {formatDate(invoice.invoice_date)}
                        {' '}&middot;{' '}
                        Due {formatDate(invoice.due_date)}
                        {invoice.paid_at && (
                          <>
                            {' '}&middot;{' '}
                            <span className="text-green-700">
                              Paid {formatDate(invoice.paid_at)}
                            </span>
                          </>
                        )}
                      </p>
                      {invoice.status === 'overdue' && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Payment is overdue
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatGBP(invoice.total)}</p>
                        <p className="text-xs text-muted-foreground">inc. VAT</p>
                      </div>
                      {invoice.pdf_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={invoice.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Total */}
          <Card className="border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between font-bold">
                <span>Total Invoiced</span>
                <span className="text-lg">
                  {formatGBP(
                    invoiceList.reduce((sum, inv) => sum + inv.total, 0)
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
