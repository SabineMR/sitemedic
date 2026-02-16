/**
 * Payment Schedule Component
 * Phase 4.6: Customer Onboarding & Contract Management - Plan 02
 *
 * Renders payment milestone table based on payment terms
 * Supports all 5 term types: full_prepay, split_50_50, split_50_net30, full_net30, custom
 */

import { Text, View } from 'npm:@react-pdf/renderer@4.3.2';
import { ContractPDFData } from '../types.ts';
import { styles } from '../styles.ts';

interface PaymentScheduleProps {
  paymentSchedule: ContractPDFData['paymentSchedule'];
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

interface PaymentMilestone {
  milestone: string;
  amount: number;
  dueDate: string;
}

/**
 * Get payment milestones based on payment terms
 */
function getPaymentMilestones(schedule: ContractPDFData['paymentSchedule']): PaymentMilestone[] {
  const { terms, upfrontAmount, completionAmount, net30Amount } = schedule;
  const milestones: PaymentMilestone[] = [];

  switch (terms) {
    case 'full_prepay':
      milestones.push({
        milestone: 'Payment in Full',
        amount: upfrontAmount,
        dueDate: 'Upon signing',
      });
      break;

    case 'split_50_50':
      milestones.push({
        milestone: 'Upfront Payment',
        amount: upfrontAmount,
        dueDate: 'Upon signing',
      });
      milestones.push({
        milestone: 'Completion Payment',
        amount: completionAmount,
        dueDate: 'Upon service completion',
      });
      break;

    case 'split_50_net30':
      milestones.push({
        milestone: 'Upfront Payment',
        amount: upfrontAmount,
        dueDate: 'Upon signing',
      });
      milestones.push({
        milestone: 'Net 30 Payment',
        amount: net30Amount,
        dueDate: '30 days after service completion',
      });
      break;

    case 'full_net30':
      milestones.push({
        milestone: 'Invoice Payment',
        amount: net30Amount,
        dueDate: '30 days after service completion',
      });
      break;

    case 'custom':
      // Custom terms: show all non-zero amounts
      if (upfrontAmount > 0) {
        milestones.push({
          milestone: 'Upfront Payment',
          amount: upfrontAmount,
          dueDate: 'Upon signing',
        });
      }
      if (completionAmount > 0) {
        milestones.push({
          milestone: 'Completion Payment',
          amount: completionAmount,
          dueDate: 'Upon service completion',
        });
      }
      if (net30Amount > 0) {
        milestones.push({
          milestone: 'Net 30 Payment',
          amount: net30Amount,
          dueDate: '30 days after service completion',
        });
      }
      break;
  }

  return milestones;
}

export function PaymentSchedule({ paymentSchedule }: PaymentScheduleProps) {
  const milestones = getPaymentMilestones(paymentSchedule);
  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);

  return (
    <View style={styles.section}>
      <Text style={styles.subheader}>PAYMENT SCHEDULE</Text>

      {/* Payment Milestones Table */}
      <View style={styles.table}>
        {/* Header Row */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <View style={styles.tableColWide}>
            <Text style={styles.tableCellHeader}>Milestone</Text>
          </View>
          <View style={styles.tableColNarrow}>
            <Text style={styles.tableCellHeader}>Amount</Text>
          </View>
          <View style={styles.tableColNarrow}>
            <Text style={styles.tableCellHeader}>Due Date</Text>
          </View>
        </View>

        {/* Milestone Rows */}
        {milestones.map((milestone, index) => (
          <View
            key={index}
            style={[
              styles.tableRow,
              index % 2 === 1 ? styles.tableRowAlt : {},
              index === milestones.length - 1 ? styles.tableRowLast : {},
            ]}
          >
            <View style={styles.tableColWide}>
              <Text style={styles.tableCellText}>{milestone.milestone}</Text>
            </View>
            <View style={styles.tableColNarrow}>
              <Text style={styles.tableCellText}>{formatCurrency(milestone.amount)}</Text>
            </View>
            <View style={styles.tableColNarrow}>
              <Text style={styles.tableCellText}>{milestone.dueDate}</Text>
            </View>
          </View>
        ))}

        {/* Total Row */}
        <View style={styles.pricingTotalRow}>
          <Text style={styles.pricingTotalLabel}>TOTAL DUE</Text>
          <Text style={styles.pricingTotalAmount}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      {/* Payment Description */}
      {paymentSchedule.description && (
        <Text style={[styles.legalText, styles.mt10]}>{paymentSchedule.description}</Text>
      )}
    </View>
  );
}
