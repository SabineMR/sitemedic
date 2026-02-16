/**
 * Contract PDF Styles
 * Phase 4.6: Customer Onboarding & Contract Management - Plan 02
 *
 * React-PDF StyleSheet with professional contract formatting
 * Follows SiteMedic brand identity established in Phase 5 generate-weekly-report
 */

import { StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';

export const styles = StyleSheet.create({
  // Page layout
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1f2937',
  },

  // Brand colors: primary #003366 (dark navy), accent #2563EB (blue)
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 5,
    textAlign: 'center',
  },

  subheader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 15,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 10,
    marginBottom: 5,
  },

  section: {
    marginBottom: 12,
  },

  // Contract metadata
  contractInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },

  contractNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563EB',
  },

  contractDate: {
    fontSize: 10,
    color: '#6b7280',
  },

  // Parties section
  partiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  partyBox: {
    width: '48%',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },

  partyLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 5,
  },

  partyText: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
  },

  // Table styles
  table: {
    display: 'flex',
    width: 'auto',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },

  tableRowLast: {
    flexDirection: 'row',
  },

  tableHeader: {
    backgroundColor: '#003366',
    color: '#ffffff',
    fontWeight: 'bold',
  },

  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },

  tableCol: {
    width: '33.33%',
    padding: 8,
    fontSize: 10,
  },

  tableColWide: {
    width: '50%',
    padding: 8,
    fontSize: 10,
  },

  tableColNarrow: {
    width: '25%',
    padding: 8,
    fontSize: 10,
  },

  tableCellHeader: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 10,
  },

  tableCellText: {
    fontSize: 10,
    color: '#374151',
  },

  // Pricing table specific
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  pricingLabel: {
    fontSize: 10,
    color: '#374151',
  },

  pricingAmount: {
    fontSize: 10,
    color: '#374151',
    fontWeight: 'normal',
  },

  pricingTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderTopWidth: 2,
    borderTopColor: '#003366',
  },

  pricingTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
  },

  pricingTotalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
  },

  // Legal text
  legalText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#374151',
    marginBottom: 8,
  },

  clauseTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 8,
    marginBottom: 3,
  },

  clauseBody: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#374151',
    marginBottom: 6,
  },

  // Signature block
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },

  signatureBox: {
    width: '45%',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 10,
    minHeight: 80,
  },

  signatureLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 5,
  },

  signatureImage: {
    width: '100%',
    height: 50,
    objectFit: 'contain',
    marginBottom: 5,
  },

  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    marginTop: 40,
    paddingTop: 5,
  },

  signatureText: {
    fontSize: 9,
    color: '#374151',
    marginTop: 3,
  },

  signatureAwaitingText: {
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 20,
  },

  signatureDisclaimer: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },

  // Utility classes
  textBold: {
    fontWeight: 'bold',
  },

  textItalic: {
    fontStyle: 'italic',
  },

  textCenter: {
    textAlign: 'center',
  },

  amountHighlight: {
    fontWeight: 'bold',
    color: '#003366',
  },

  // Badge styles
  badge: {
    display: 'inline',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
  },

  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },

  badgeSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },

  // Spacing utilities
  mb5: {
    marginBottom: 5,
  },

  mb10: {
    marginBottom: 10,
  },

  mb15: {
    marginBottom: 15,
  },

  mt10: {
    marginTop: 10,
  },

  mt20: {
    marginTop: 20,
  },
});
