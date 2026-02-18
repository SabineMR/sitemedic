/**
 * Contract PDF Main Document
 * Phase 4.6: Customer Onboarding & Contract Management - Plan 02
 *
 * Main PDF composition with all sections: header, parties, booking details,
 * pricing breakdown, payment schedule, terms, signature block
 */

import { Document, Page, Text, View } from 'npm:@react-pdf/renderer@4.3.2';
import { ContractPDFData } from '../types.ts';
import { styles } from '../styles.ts';
import { ServiceTerms } from './ServiceTerms.tsx';
import { PaymentSchedule } from './PaymentSchedule.tsx';
import { SignatureBlock } from './SignatureBlock.tsx';

interface ContractDocumentProps {
  data: ContractPDFData;
}

/**
 * Format date to UK format: "16 February 2026"
 */
function formatDateLong(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date to short UK format: "16 Feb 2026"
 */
function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format currency to GBP: £1,000.00
 */
function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format time: "09:00"
 */
function formatTime(time: string): string {
  // Time is already in HH:mm format from database
  return time;
}

export function ContractDocument({ data }: ContractDocumentProps) {
  const {
    contractNumber,
    generatedAt,
    client,
    site,
    booking,
    pricing,
    paymentSchedule,
    template,
    signature,
  } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.section}>
          <Text style={styles.header}>SERVICE AGREEMENT</Text>
          <View style={styles.contractInfo}>
            <View>
              <Text style={styles.contractNumber}>Contract No: {contractNumber}</Text>
            </View>
            <View>
              <Text style={styles.contractDate}>
                Generated: {formatDateLong(generatedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Parties Section */}
        <View style={styles.section}>
          <Text style={styles.subheader}>PARTIES TO THIS AGREEMENT</Text>
          <View style={styles.partiesContainer}>
            {/* Provider */}
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>PROVIDER:</Text>
              <Text style={styles.partyText}>{data.providerName || 'SiteMedic Ltd'}</Text>
              <Text style={styles.partyText}>123 Medical Way</Text>
              <Text style={styles.partyText}>London, SW1A 1AA</Text>
              <Text style={styles.partyText}>VAT: GB123456789</Text>
            </View>

            {/* Client */}
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>CLIENT:</Text>
              <Text style={styles.partyText}>{client.companyName}</Text>
              <Text style={styles.partyText}>{client.contactName}</Text>
              <Text style={styles.partyText}>{client.address}</Text>
              <Text style={styles.partyText}>{client.postcode}</Text>
              {client.vatNumber && (
                <Text style={styles.partyText}>VAT: {client.vatNumber}</Text>
              )}
              <Text style={styles.partyText}>{client.contactEmail}</Text>
            </View>
          </View>
        </View>

        {/* Site Details */}
        <View style={styles.section}>
          <Text style={styles.subheader}>SITE DETAILS</Text>
          <View style={[styles.partyBox, { width: '100%' }]}>
            <Text style={styles.partyText}>
              <Text style={styles.textBold}>Site Name:</Text> {site.name}
            </Text>
            <Text style={styles.partyText}>
              <Text style={styles.textBold}>Address:</Text> {site.address}, {site.postcode}
            </Text>
            {site.contactName && (
              <Text style={styles.partyText}>
                <Text style={styles.textBold}>Site Contact:</Text> {site.contactName}
                {site.contactPhone && ` - ${site.contactPhone}`}
              </Text>
            )}
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.subheader}>SERVICE BOOKING</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellHeader}>Date</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellHeader}>Time</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellHeader}>Hours</Text>
              </View>
            </View>

            {/* Data Row */}
            <View style={styles.tableRowLast}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellText}>
                  {formatDateShort(booking.shiftDate)}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellText}>
                  {formatTime(booking.shiftStart)} - {formatTime(booking.shiftEnd)}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCellText}>{booking.hours} hours</Text>
              </View>
            </View>
          </View>

          {booking.isRecurring && (
            <Text style={[styles.legalText, styles.mt10]}>
              <Text style={styles.textBold}>Recurring Service:</Text> {booking.recurrencePattern}
              {booking.recurringUntil && ` until ${formatDateShort(booking.recurringUntil)}`}
            </Text>
          )}

          {booking.specialRequirements && (
            <View style={styles.mt10}>
              <Text style={styles.sectionTitle}>Special Requirements:</Text>
              <Text style={styles.legalText}>{booking.specialRequirements}</Text>
            </View>
          )}
        </View>

        {/* Pricing Breakdown */}
        <View style={styles.section}>
          <Text style={styles.subheader}>PRICING</Text>
          <View style={styles.table}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>
                Base Rate ({formatCurrency(pricing.baseRate)}/hr × {pricing.hours} hrs)
              </Text>
              <Text style={styles.pricingAmount}>{formatCurrency(pricing.subtotal)}</Text>
            </View>

            {pricing.urgencyPremiumPercent > 0 && (
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>
                  Urgency Premium ({pricing.urgencyPremiumPercent}%)
                </Text>
                <Text style={styles.pricingAmount}>
                  {formatCurrency(pricing.urgencyPremiumAmount)}
                </Text>
              </View>
            )}

            {pricing.travelSurcharge > 0 && (
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Travel Surcharge</Text>
                <Text style={styles.pricingAmount}>{formatCurrency(pricing.travelSurcharge)}</Text>
              </View>
            )}

            {pricing.outOfTerritoryCost > 0 && (
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Out of Territory Cost</Text>
                <Text style={styles.pricingAmount}>
                  {formatCurrency(pricing.outOfTerritoryCost)}
                </Text>
              </View>
            )}

            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Net Amount</Text>
              <Text style={styles.pricingAmount}>{formatCurrency(pricing.netAmount)}</Text>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>VAT (20%)</Text>
              <Text style={styles.pricingAmount}>{formatCurrency(pricing.vat)}</Text>
            </View>

            <View style={styles.pricingTotalRow}>
              <Text style={styles.pricingTotalLabel}>TOTAL</Text>
              <Text style={styles.pricingTotalAmount}>{formatCurrency(pricing.total)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Schedule */}
        <PaymentSchedule paymentSchedule={paymentSchedule} />

        {/* Service Terms */}
        <ServiceTerms template={template} />

        {/* Signature Block */}
        <SignatureBlock signature={signature} clientName={client.contactName} providerName={data.providerName} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {data.providerName || 'SiteMedic Ltd'} - Registered in England & Wales
          </Text>
          <Text>This is a legally binding agreement. Please retain a copy for your records.</Text>
        </View>
      </Page>
    </Document>
  );
}
