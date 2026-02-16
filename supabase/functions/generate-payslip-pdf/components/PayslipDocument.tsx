import React from 'npm:react@18.2.0';
import { Document, Page, Text, View, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';

interface PayslipData {
  medic_name: string;
  employment_status: 'self_employed' | 'umbrella';
  utr: string | null;
  umbrella_company_name: string | null;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string;
  gross_pay: number;
  tax_deducted: number;
  ni_deducted: number;
  net_pay: number;
  hours_worked: number;
  hourly_rate: number;
  booking_site: string;
  payslip_reference: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#003366', paddingBottom: 10 },
  companyName: { fontSize: 16, fontWeight: 'bold', color: '#003366' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#003366', marginTop: 5 },
  section: { marginTop: 15, marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, color: '#003366' },
  detailRow: { flexDirection: 'row', marginBottom: 5 },
  label: { width: '40%', fontWeight: 'bold' },
  value: { width: '60%' },
  table: { marginTop: 10 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#003366',
    paddingVertical: 8,
    backgroundColor: '#f0f4f8'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8
  },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  textBold: { fontWeight: 'bold' },
  textRight: { textAlign: 'right' },
  summaryBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#003366'
  },
  summaryRow: { flexDirection: 'row', marginBottom: 8 },
  summaryLabel: { width: '70%', fontSize: 11 },
  summaryValue: { width: '30%', textAlign: 'right', fontSize: 11 },
  netPayRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#003366'
  },
  netPayLabel: { width: '70%', fontSize: 14, fontWeight: 'bold', color: '#003366' },
  netPayValue: { width: '30%', textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: '#003366' },
  note: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fff9e6',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    fontSize: 9
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 8,
    color: '#666'
  },
});

export const PayslipDocument = ({ data }: { data: PayslipData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>SiteMedic</Text>
        <Text style={styles.title}>PAYSLIP</Text>
      </View>

      {/* Medic Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medic Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.medic_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Employment Status:</Text>
          <Text style={styles.value}>
            {data.employment_status === 'self_employed' ? 'Self-Employed' : 'Umbrella Company'}
          </Text>
        </View>
        {data.employment_status === 'self_employed' && data.utr && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>UTR Number:</Text>
            <Text style={styles.value}>{data.utr}</Text>
          </View>
        )}
        {data.employment_status === 'umbrella' && data.umbrella_company_name && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Umbrella Company:</Text>
            <Text style={styles.value}>{data.umbrella_company_name}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.label}>Payslip Reference:</Text>
          <Text style={styles.value}>{data.payslip_reference}</Text>
        </View>
      </View>

      {/* Pay Period */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pay Period</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Period:</Text>
          <Text style={styles.value}>{data.pay_period_start} to {data.pay_period_end}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Payment Date:</Text>
          <Text style={styles.value}>{data.payment_date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Site:</Text>
          <Text style={styles.value}>{data.booking_site}</Text>
        </View>
      </View>

      {/* Earnings Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earnings</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.textBold]}>Description</Text>
            <Text style={[styles.col2, styles.textBold]}>Hours</Text>
            <Text style={[styles.col3, styles.textBold]}>Rate</Text>
            <Text style={[styles.col4, styles.textBold]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>Medic services</Text>
            <Text style={styles.col2}>{data.hours_worked.toFixed(1)}</Text>
            <Text style={styles.col3}>£{data.hourly_rate.toFixed(2)}</Text>
            <Text style={styles.col4}>£{data.gross_pay.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Deductions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deductions</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.textBold]}>Description</Text>
            <Text style={[styles.col4, styles.textBold]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>Tax deducted</Text>
            <Text style={styles.col4}>£{data.tax_deducted.toFixed(2)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>National Insurance deducted</Text>
            <Text style={styles.col4}>£{data.ni_deducted.toFixed(2)}</Text>
          </View>
        </View>

        {data.employment_status === 'self_employed' && (
          <View style={styles.note}>
            <Text>
              Note: As a self-employed contractor, you are responsible for your own tax and National Insurance
              contributions via Self Assessment. No deductions are made from your payments.
            </Text>
          </View>
        )}
      </View>

      {/* Net Pay Summary */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Gross Pay</Text>
          <Text style={styles.summaryValue}>£{data.gross_pay.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Deductions</Text>
          <Text style={styles.summaryValue}>£{(data.tax_deducted + data.ni_deducted).toFixed(2)}</Text>
        </View>
        <View style={styles.netPayRow}>
          <Text style={styles.netPayLabel}>Net Pay</Text>
          <Text style={styles.netPayValue}>£{data.net_pay.toFixed(2)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>This payslip is for your records. SiteMedic does not deduct tax or National Insurance for self-employed contractors.</Text>
        <Text style={{ marginTop: 5 }}>Generated: {new Date().toLocaleDateString('en-GB')}</Text>
      </View>
    </Page>
  </Document>
);
