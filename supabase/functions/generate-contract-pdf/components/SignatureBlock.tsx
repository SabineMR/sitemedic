/**
 * Signature Block Component
 * Phase 4.6: Customer Onboarding & Contract Management - Plan 02
 *
 * Renders dual-column signature section for Provider and Client
 * Shows signature image if provided, otherwise "Awaiting signature" placeholder
 */

import { Image, Text, View } from 'npm:@react-pdf/renderer@4.3.2';
import { ContractPDFData } from '../types.ts';
import { styles } from '../styles.ts';

interface SignatureBlockProps {
  signature?: ContractPDFData['signature'];
  clientName: string;
  providerName?: string;
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

export function SignatureBlock({ signature, clientName, providerName = 'SiteMedic Ltd' }: SignatureBlockProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.subheader}>SIGNATURES</Text>

      {/* Signature Container - Two Columns */}
      <View style={styles.signatureContainer}>
        {/* Provider Signature */}
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>PROVIDER</Text>
          <Text style={[styles.signatureText, styles.mb5]}>{providerName}</Text>

          {/* Signature Line */}
          <View style={styles.signatureLine}>
            <Text style={styles.signatureText}>Authorized Representative</Text>
            <Text style={[styles.signatureText, { marginTop: 5 }]}>
              Date: {formatDateLong(new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* Client Signature */}
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>CLIENT</Text>

          {signature ? (
            <>
              {/* Signed: Show signature image and details */}
              <Image src={signature.dataUrl} style={styles.signatureImage} />
              <Text style={styles.signatureText}>Name: {signature.signedName}</Text>
              <Text style={styles.signatureText}>Email: {signature.signedByEmail}</Text>
              <Text style={[styles.signatureText, { marginTop: 5 }]}>
                Signed: {formatDateLong(signature.signedAt)}
              </Text>
            </>
          ) : (
            <>
              {/* Unsigned: Show placeholder */}
              <Text style={styles.signatureAwaitingText}>Awaiting signature</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureText}>Name: {clientName}</Text>
                <Text style={[styles.signatureText, { marginTop: 5 }]}>Date: ____________</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Signature Disclaimers */}
      <View style={styles.mt20}>
        <Text style={styles.legalText}>
          By signing this agreement, you confirm that you have read, understood, and agree to the
          terms and conditions above. This agreement constitutes a legally binding contract between
          the Provider and the Client.
        </Text>

        {signature && (
          <Text style={styles.signatureDisclaimer}>
            Digital signature captured and stored with timestamp and IP address for verification
            purposes in accordance with UK Electronic Communications Act 2000.
          </Text>
        )}
      </View>
    </View>
  );
}
