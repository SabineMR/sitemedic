import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  client: {
    company_name: string;
    billing_address: string;
    billing_postcode: string;
    vat_number: string | null;
  };
  line_items: Array<{
    description: string;
    quantity: number; // hours
    unit_price: number;
    amount: number;
  }>;
  subtotal: number;
  vat: number; // 20%
  total: number;
  payment_terms: 'prepay' | 'net_30';
  late_fee_charged: number;
}

// Export to avoid global scope collision with Next.js types
export const invoiceStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  invoiceNumber: { fontSize: 12, color: '#666', marginTop: 5 },
  section: { marginTop: 15, marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 8 },
  column: { flex: 1 },
  textRight: { textAlign: 'right' },
  textBold: { fontWeight: 'bold' },
  total: { fontSize: 14, fontWeight: 'bold', backgroundColor: '#f3f4f6', padding: 10, marginTop: 10 },
  footer: { marginTop: 30, fontSize: 9, color: '#666' },
});

export const InvoiceDocument = ({ data }: { data: InvoiceData }) => (
  <Document>
    <Page size="A4" style={invoiceStyles.page}>
      {/* Header */}
      <View style={invoiceStyles.header}>
        <Text style={invoiceStyles.title}>INVOICE</Text>
        <Text style={invoiceStyles.invoiceNumber}>{data.invoice_number}</Text>
      </View>

      {/* Bill To */}
      <View style={invoiceStyles.section}>
        <Text style={invoiceStyles.sectionTitle}>Bill To:</Text>
        <Text>{data.client.company_name}</Text>
        <Text>{data.client.billing_address}</Text>
        <Text>{data.client.billing_postcode}</Text>
        {data.client.vat_number && <Text>VAT: {data.client.vat_number}</Text>}
      </View>

      {/* Invoice Details */}
      <View style={invoiceStyles.section}>
        <View style={invoiceStyles.row}>
          <Text style={invoiceStyles.column}>Invoice Date:</Text>
          <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>{data.invoice_date}</Text>
        </View>
        <View style={invoiceStyles.row}>
          <Text style={invoiceStyles.column}>Due Date:</Text>
          <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>{data.due_date}</Text>
        </View>
        <View style={invoiceStyles.row}>
          <Text style={invoiceStyles.column}>Payment Terms:</Text>
          <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>
            {data.payment_terms === 'net_30' ? 'Net 30' : 'Prepay'}
          </Text>
        </View>
      </View>

      {/* Line Items */}
      <View style={invoiceStyles.section}>
        <Text style={invoiceStyles.sectionTitle}>Services</Text>
        <View style={[invoiceStyles.row, invoiceStyles.textBold]}>
          <Text style={[invoiceStyles.column, { flex: 3 }]}>Description</Text>
          <Text style={invoiceStyles.column}>Hours</Text>
          <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>Rate</Text>
          <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>Amount</Text>
        </View>
        {data.line_items.map((item, idx) => (
          <View key={idx} style={invoiceStyles.row}>
            <Text style={[invoiceStyles.column, { flex: 3 }]}>{item.description}</Text>
            <Text style={invoiceStyles.column}>{item.quantity}</Text>
            <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>£{item.unit_price.toFixed(2)}</Text>
            <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>£{item.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={[invoiceStyles.section, { alignItems: 'flex-end' }]}>
        <View style={{ width: '50%' }}>
          <View style={invoiceStyles.row}>
            <Text style={invoiceStyles.column}>Subtotal:</Text>
            <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>£{data.subtotal.toFixed(2)}</Text>
          </View>
          <View style={invoiceStyles.row}>
            <Text style={invoiceStyles.column}>VAT (20%):</Text>
            <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>£{data.vat.toFixed(2)}</Text>
          </View>
          {data.late_fee_charged > 0 && (
            <View style={invoiceStyles.row}>
              <Text style={invoiceStyles.column}>Late Payment Fee:</Text>
              <Text style={[invoiceStyles.column, invoiceStyles.textRight]}>£{data.late_fee_charged.toFixed(2)}</Text>
            </View>
          )}
          <View style={[invoiceStyles.row, invoiceStyles.total]}>
            <Text style={[invoiceStyles.column, invoiceStyles.textBold]}>Total Due:</Text>
            <Text style={[invoiceStyles.column, invoiceStyles.textRight, invoiceStyles.textBold]}>
              £{(data.total + data.late_fee_charged).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={invoiceStyles.footer}>
        <Text>Payment is due within 30 days of invoice date.</Text>
        <Text>Late payments subject to statutory late fees under the Late Payment of Commercial Debts (Interest) Act 1998.</Text>
        <Text>Bank details: Sort Code 12-34-56, Account 12345678</Text>
      </View>
    </Page>
  </Document>
);

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  return renderToBuffer(<InvoiceDocument data={data} />);
}
