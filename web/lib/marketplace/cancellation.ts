/**
 * Marketplace Cancellation Logic
 * Phase 36: Ratings, Messaging & Disputes — Plan 03
 *
 * Tiered refund calculation for marketplace event cancellations.
 *
 * Client cancellation policy:
 *   - >14 days before event: 100% deposit refund
 *   - 7-14 days before event: 50% deposit refund
 *   - <7 days before event: 0% refund (full deposit retained by company)
 *
 * Company cancellation:
 *   - Always 100% refund to client
 */

import { differenceInDays } from 'date-fns';
import type { CancellationBreakdown } from './dispute-types';

/**
 * Calculate the refund breakdown for a client-initiated marketplace cancellation.
 *
 * @param depositPaid  Amount paid as deposit (GBP)
 * @param eventStartDate  ISO date string of the first event day
 * @returns Full breakdown with tier label, refund amount, and retained amount
 */
export function calculateMarketplaceCancellationRefund(
  depositPaid: number,
  eventStartDate: string
): CancellationBreakdown {
  const daysUntilEvent = differenceInDays(new Date(eventStartDate), new Date());

  let refundPercent: number;
  let tier: string;

  if (daysUntilEvent > 14) {
    refundPercent = 100;
    tier = 'More than 14 days before event';
  } else if (daysUntilEvent >= 7) {
    refundPercent = 50;
    tier = '7-14 days before event';
  } else {
    refundPercent = 0;
    tier = 'Less than 7 days before event';
  }

  const refundAmount = parseFloat(((depositPaid * refundPercent) / 100).toFixed(2));
  const retainedAmount = parseFloat((depositPaid - refundAmount).toFixed(2));

  return {
    depositPaid,
    daysUntilEvent,
    tier,
    refundPercent,
    refundAmount,
    retainedAmount,
  };
}

/**
 * Calculate the refund breakdown for a company-initiated marketplace cancellation.
 * Company cancellations always result in a full refund to the client.
 */
export function calculateCompanyCancellationRefund(
  depositPaid: number
): CancellationBreakdown {
  return {
    depositPaid,
    daysUntilEvent: 0,
    tier: 'Company cancellation (full refund)',
    refundPercent: 100,
    refundAmount: depositPaid,
    retainedAmount: 0,
  };
}
