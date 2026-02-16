/**
 * Service Terms Component
 * Phase 4.6: Customer Onboarding & Contract Management - Plan 02
 *
 * Renders contract clauses, terms and conditions, and cancellation policy
 */

import { Text, View } from 'npm:@react-pdf/renderer@4.3.2';
import { ContractPDFData } from '../types.ts';
import { styles } from '../styles.ts';

interface ServiceTermsProps {
  template: ContractPDFData['template'];
}

export function ServiceTerms({ template }: ServiceTermsProps) {
  const { clauses, termsAndConditions, cancellationPolicy } = template;

  // Sort clauses by order
  const sortedClauses = [...clauses].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.section}>
      <Text style={styles.subheader}>TERMS AND CONDITIONS</Text>

      {/* Numbered Clauses */}
      {sortedClauses.map((clause, index) => (
        <View key={index} style={styles.mb10}>
          <Text style={styles.clauseTitle}>
            {index + 1}. {clause.title}
          </Text>
          <Text style={styles.clauseBody}>{clause.body}</Text>
        </View>
      ))}

      {/* General Terms and Conditions */}
      {termsAndConditions && (
        <View style={styles.mt20}>
          <Text style={styles.sectionTitle}>General Terms</Text>
          <Text style={styles.legalText}>{termsAndConditions}</Text>
        </View>
      )}

      {/* Cancellation Policy */}
      {cancellationPolicy && (
        <View style={styles.mt10}>
          <Text style={styles.sectionTitle}>Cancellation Policy</Text>
          <Text style={styles.legalText}>{cancellationPolicy}</Text>
        </View>
      )}
    </View>
  );
}
