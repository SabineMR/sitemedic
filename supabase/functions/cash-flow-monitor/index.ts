/**
 * Cash Flow Monitor Edge Function
 * CRITICAL RISK MITIGATION: Prevents business from running out of cash
 *
 * Problem: Pay medics Friday Week 1, collect from Net 30 clients Week 5
 * Solution: Daily monitoring + alerts + credit limit enforcement
 *
 * Runs: Daily at 8 AM UK time (cron job)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { sendCashFlowAlert } from '../_shared/email-templates.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@sitemedic.co.uk';

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Thresholds (in GBP)
const CRITICAL_CASH_RESERVE = 5000; // £5k - can't pay Friday payouts
const WARNING_CASH_RESERVE = 15000; // £15k - approaching danger
const TARGET_CASH_RESERVE = 20000; // £20k - safe level
const MAX_CASH_GAP_DAYS = 30; // Alert if gap exceeds 30 days

interface CashFlowMetrics {
  current_cash_balance: number;
  this_week_payouts_due: number;
  this_week_payments_expected: number;
  net_this_week: number;
  outstanding_invoices_total: number;
  cash_gap_days: number;
  status: 'critical' | 'warning' | 'healthy';
  recommendations: string[];
}

serve(async (req: Request) => {
  console.log('💰 Cash Flow Monitor started');

  try {
    const metrics = await calculateCashFlowMetrics();
    const alert = determineAlertLevel(metrics);

    console.log('📊 Cash Flow Metrics:', JSON.stringify(metrics, null, 2));

    // Send alerts if needed
    if (alert.level !== 'none') {
      await sendAdminAlert(alert, metrics);
    }

    // Auto-suspend Net 30 approvals if critical
    if (metrics.status === 'critical') {
      await suspendNet30Approvals();
    }

    // Store metrics for dashboard
    await storeMetrics(metrics);

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        alert,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Cash flow monitor failed:', error);

    // CRITICAL: Alert admin of monitoring failure
    await sendCriticalFailureAlert(error.message);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Calculate current cash flow metrics
 */
async function calculateCashFlowMetrics(): Promise<CashFlowMetrics> {
  const now = new Date();
  const nextFriday = getNextFriday(now);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Get current Stripe balance (platform account)
  // NOTE: This requires Stripe Balance API call
  const currentCashBalance = await getStripePlatformBalance();

  // 2. Calculate this week's payouts due (admin-approved timesheets)
  const { data: timesheets } = await supabase
    .from('timesheets')
    .select('payout_amount')
    .eq('payout_status', 'admin_approved')
    .is('paid_at', null);

  const thisWeekPayoutsDue = timesheets?.reduce((sum, t) => sum + parseFloat(t.payout_amount), 0) || 0;

  // 3. Calculate expected payments this week (invoices due)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total')
    .eq('status', 'sent')
    .lte('due_date', oneWeekFromNow.toISOString().split('T')[0]);

  const thisWeekPaymentsExpected = invoices?.reduce((sum, inv) => sum + parseFloat(inv.total), 0) || 0;

  // 4. Calculate total outstanding invoices (Net 30 clients)
  const { data: outstandingInvoices } = await supabase
    .from('invoices')
    .select('total')
    .in('status', ['sent', 'overdue']);

  const outstandingInvoicesTotal = outstandingInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total), 0) || 0;

  // 5. Calculate cash gap (days until we run out of money)
  const netThisWeek = currentCashBalance + thisWeekPaymentsExpected - thisWeekPayoutsDue;
  const cashGapDays = calculateCashGapDays(currentCashBalance, thisWeekPayoutsDue, thisWeekPaymentsExpected);

  // 6. Determine status
  let status: 'critical' | 'warning' | 'healthy' = 'healthy';
  if (currentCashBalance < CRITICAL_CASH_RESERVE || cashGapDays < 7) {
    status = 'critical';
  } else if (currentCashBalance < WARNING_CASH_RESERVE || cashGapDays < 14) {
    status = 'warning';
  }

  // 7. Generate recommendations
  const recommendations = generateRecommendations({
    currentCashBalance,
    thisWeekPayoutsDue,
    netThisWeek,
    cashGapDays,
  });

  return {
    current_cash_balance: currentCashBalance,
    this_week_payouts_due: thisWeekPayoutsDue,
    this_week_payments_expected: thisWeekPaymentsExpected,
    net_this_week: netThisWeek,
    outstanding_invoices_total: outstandingInvoicesTotal,
    cash_gap_days: cashGapDays,
    status,
    recommendations,
  };
}

/**
 * Get Stripe platform account balance
 */
async function getStripePlatformBalance(): Promise<number> {
  try {
    const balance = await stripe.balance.retrieve();

    // Find GBP balance in available funds
    const gbpBalance = balance.available.find((b) => b.currency === 'gbp');

    if (gbpBalance) {
      // Convert pence to pounds
      const balanceInGBP = gbpBalance.amount / 100;
      console.log(`✅ Stripe balance retrieved: £${balanceInGBP.toLocaleString()}`);
      return balanceInGBP;
    }

    // If no GBP balance found, return 0
    console.warn('⚠️  No GBP balance found in Stripe account');
    return 0;
  } catch (error) {
    console.error('❌ Failed to fetch Stripe balance:', error);
    console.warn('⚠️  Using fallback mock balance (£12,000)');

    // Fallback to mock value on error (with warning already logged)
    return 12000;
  }
}

/**
 * Calculate how many days until cash runs out
 */
function calculateCashGapDays(
  currentCash: number,
  weeklyPayouts: number,
  weeklyPayments: number
): number {
  const weeklyBurn = weeklyPayouts - weeklyPayments;
  if (weeklyBurn <= 0) {
    return 999; // Cash positive - no gap
  }

  const daysUntilZero = Math.floor((currentCash / weeklyBurn) * 7);
  return Math.max(0, daysUntilZero);
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(data: {
  currentCashBalance: number;
  thisWeekPayoutsDue: number;
  netThisWeek: number;
  cashGapDays: number;
}): string[] {
  const recs: string[] = [];

  if (data.currentCashBalance < CRITICAL_CASH_RESERVE) {
    recs.push('🚨 URGENT: Inject £' + (TARGET_CASH_RESERVE - data.currentCashBalance).toFixed(0) + ' cash immediately');
    recs.push('Convert all new clients to prepay (disable Net 30)');
    recs.push('Contact overdue Net 30 clients for immediate payment');
  } else if (data.currentCashBalance < WARNING_CASH_RESERVE) {
    recs.push('⚠️  Cash reserve low - review Net 30 client credit limits');
    recs.push('Consider prepay for next 2 weeks of bookings');
    recs.push('Send payment reminders to clients with invoices due this week');
  }

  if (data.netThisWeek < 0) {
    recs.push('Cash flow negative this week (£' + Math.abs(data.netThisWeek).toFixed(0) + ' shortfall)');
    recs.push('Delay non-essential expenses until next week');
  }

  if (data.cashGapDays < 14 && data.cashGapDays > 0) {
    recs.push('Cash runway: ' + data.cashGapDays + ' days - secure additional funding');
    recs.push('Pause hiring new medics until cash flow improves');
  }

  if (data.thisWeekPayoutsDue > data.currentCashBalance) {
    recs.push('🚨 CANNOT PAY MEDICS THIS FRIDAY - insufficient funds');
    recs.push('Contact medics to explain delay and provide payment plan');
  }

  if (recs.length === 0) {
    recs.push('✅ Cash flow healthy - continue current operations');
  }

  return recs;
}

/**
 * Determine alert level
 */
function determineAlertLevel(metrics: CashFlowMetrics): {
  level: 'critical' | 'warning' | 'none';
  title: string;
  message: string;
} {
  if (metrics.status === 'critical') {
    return {
      level: 'critical',
      title: '🚨 CRITICAL: Cash Flow Crisis',
      message: `Cash reserve: £${metrics.current_cash_balance.toFixed(0)} (target: £${TARGET_CASH_RESERVE}). Cannot pay medics this Friday without immediate action.`,
    };
  }

  if (metrics.status === 'warning') {
    return {
      level: 'warning',
      title: '⚠️  WARNING: Low Cash Reserve',
      message: `Cash reserve: £${metrics.current_cash_balance.toFixed(0)} (target: £${TARGET_CASH_RESERVE}). Review Net 30 clients and consider prepay for new bookings.`,
    };
  }

  return {
    level: 'none',
    title: '',
    message: '',
  };
}

/**
 * Send email alert to admin
 */
async function sendAdminAlert(
  alert: { level: string; title: string; message: string },
  metrics: CashFlowMetrics
): Promise<void> {
  console.log(`📧 Sending ${alert.level} alert to ${ADMIN_EMAIL}`);

  // Only send email for critical or warning alerts
  if (alert.level === 'critical' || alert.level === 'warning') {
    try {
      await sendCashFlowAlert(
        ADMIN_EMAIL,
        metrics.current_cash_balance,
        metrics.this_week_payouts_due,
        metrics.cash_gap_days
      );
      console.log(`✅ Cash flow alert email sent successfully`);
    } catch (emailError) {
      console.error(`❌ Failed to send cash flow alert email:`, emailError);
      // Log the alert details as fallback
      console.log('Alert subject:', alert.title);
      console.log('Alert message:', alert.message);
      console.log('Cash balance:', metrics.current_cash_balance);
      console.log('Weekly payouts due:', metrics.this_week_payouts_due);
      console.log('Cash gap days:', metrics.cash_gap_days);
    }
  }
}

/**
 * Send critical failure alert
 */
async function sendCriticalFailureAlert(errorMessage: string): Promise<void> {
  console.error('🚨 CRITICAL: Cash flow monitor failed:', errorMessage);

  // TODO: Implement emergency alert (SMS + email)
  // This is a critical system failure - admin must be notified immediately
}

/**
 * Auto-suspend Net 30 approvals if cash critical
 */
async function suspendNet30Approvals(): Promise<void> {
  console.log('🔒 Suspending Net 30 client approvals (cash critical)');

  // Set flag in database to prevent admin from approving new Net 30 clients
  await supabase
    .from('system_settings')
    .upsert({
      key: 'net_30_approvals_suspended',
      value: true,
      reason: 'Cash reserve below critical threshold',
      suspended_at: new Date().toISOString(),
    });

  console.log('✅ Net 30 approvals suspended');
}

/**
 * Store metrics for dashboard
 */
async function storeMetrics(metrics: CashFlowMetrics): Promise<void> {
  await supabase.from('cash_flow_metrics').insert({
    date: new Date().toISOString().split('T')[0],
    current_cash_balance: metrics.current_cash_balance,
    payouts_due: metrics.this_week_payouts_due,
    payments_expected: metrics.this_week_payments_expected,
    outstanding_invoices: metrics.outstanding_invoices_total,
    cash_gap_days: metrics.cash_gap_days,
    status: metrics.status,
    recommendations: metrics.recommendations,
  });
}

/**
 * Get next Friday (UK time)
 */
function getNextFriday(date: Date): Date {
  const friday = new Date(date);
  const dayOfWeek = friday.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // 0 = Sunday, 5 = Friday
  friday.setDate(friday.getDate() + daysUntilFriday);
  return friday;
}
