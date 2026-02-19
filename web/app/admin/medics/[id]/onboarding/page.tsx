/**
 * Medic Onboarding Page — Admin
 *
 * Complete onboarding checklist for a specific medic:
 * - Personal details status
 * - Qualifications
 * - IR35 compliance
 * - Stripe Express payout setup
 * - Payslip history
 *
 * Route: /admin/medics/[id]/onboarding
 * Access: org_admin role only
 */

import { createClient } from '@/lib/supabase/server';
import { StripeOnboardingStatus } from '@/components/medics/stripe-onboarding-status';
import { IR35SectionClient } from '@/components/medics/ir35-section-client';
import { CompensationSettings } from '@/components/medics/compensation-settings';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import type { ExperienceLevel } from '@/lib/medics/experience';

export default async function MedicOnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: medicId } = await params;
  const supabase = await createClient();

  // Fetch medic data with payslips
  const { data: medic, error } = await supabase
    .from('medics')
    .select(`
      *,
      payslips (
        id,
        pay_period_start,
        pay_period_end,
        gross_pay,
        tax_deducted,
        ni_deducted,
        net_pay,
        pdf_url,
        created_at
      )
    `)
    .eq('id', medicId)
    .single();

  if (error || !medic) {
    notFound();
  }

  // Calculate completion status
  const hasPersonalDetails = !!(medic.first_name && medic.last_name && medic.email && medic.home_postcode);
  const hasQualifications = !!(medic.qualifications && medic.qualifications.length > 0);
  const hasIR35Status = !!(medic.employment_status && (medic.utr || medic.umbrella_company_name));
  const hasStripeAccount = medic.stripe_onboarding_complete || false;
  const isReadyForPayouts = hasPersonalDetails && hasQualifications && hasIR35Status && hasStripeAccount;

  const completedSteps = [hasPersonalDetails, hasQualifications, hasIR35Status, hasStripeAccount].filter(Boolean).length;
  const progress = Math.round((completedSteps / 4) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/medics"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Medics
          </Link>
          <span className="text-gray-600">/</span>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {medic.first_name} {medic.last_name} — Onboarding
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Complete all sections to enable payouts · {completedSteps}/4 steps complete
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isReadyForPayouts ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-gray-300 text-sm font-medium">{progress}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-5">
        {/* Checklist */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Onboarding Checklist</h2>
          <div className="grid grid-cols-2 gap-3">
            <CheckItem label="Personal details" completed={hasPersonalDetails} />
            <CheckItem label="Qualifications" completed={hasQualifications} />
            <CheckItem label="IR35 status" completed={hasIR35Status} />
            <CheckItem label="Stripe Express account" completed={hasStripeAccount} />
          </div>
          {isReadyForPayouts && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-green-900/30 border border-green-600/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm font-medium">Ready for payouts — all steps complete</p>
            </div>
          )}
        </div>

        {/* Personal Info */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Personal Information</h2>
            <StatusBadge completed={hasPersonalDetails} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow label="Name" value={`${medic.first_name} ${medic.last_name}`} />
            <InfoRow label="Email" value={medic.email} />
            <InfoRow label="Phone" value={medic.phone} />
            <InfoRow label="Home Postcode" value={medic.home_postcode} />
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Qualifications</h2>
            <StatusBadge completed={hasQualifications} />
          </div>
          {medic.qualifications && medic.qualifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {medic.qualifications.map((qual: string, index: number) => (
                <span
                  key={index}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/50 border border-blue-700/50 text-blue-300 rounded-full text-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  {qual}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No qualifications recorded yet</p>
          )}
        </div>

        {/* IR35 Compliance */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">IR35 Compliance</h2>
            <StatusBadge completed={hasIR35Status} />
          </div>
          {!hasIR35Status ? (
            <>
              <p className="text-gray-400 mb-4 text-sm">
                Medic must complete IR35 assessment before receiving payouts.
              </p>
              <IR35Form medicId={medicId} onComplete={() => window.location.reload()} />
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Employment Status" value={medic.employment_status?.replace('_', ' ')} capitalize />
              {medic.employment_status === 'self_employed' && (
                <>
                  <InfoRow label="UTR" value={medic.utr} />
                  <InfoRow label="CEST Assessment" value={medic.cest_assessment_result?.replace('_', ' ')} capitalize />
                  {medic.cest_pdf_url && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">CEST PDF</p>
                      <a
                        href={medic.cest_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline text-sm"
                      >
                        Download PDF
                      </a>
                    </div>
                  )}
                </>
              )}
              {medic.employment_status === 'umbrella' && (
                <InfoRow label="Umbrella Company" value={medic.umbrella_company_name} />
              )}
            </div>
          )}
        </div>

        {/* Payout Setup */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Payout Setup (Stripe)</h2>
            <StatusBadge completed={hasStripeAccount} />
          </div>
          <StripeOnboardingStatus medicId={medicId} />
        </div>

        {/* Compensation & Mileage */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Compensation & Mileage</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Experience tier · payout % · HMRC mileage rate
              </p>
            </div>
          </div>
          <CompensationSettings
            medicId={medicId}
            initialLevel={(medic.experience_level ?? 'junior') as ExperienceLevel}
            medicName={`${medic.first_name} ${medic.last_name}`}
          />
        </div>

        {/* Payslip History */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Payslip History</h2>
            <Link
              href={`/admin/medics/${medicId}/payslips`}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              View all payslips →
            </Link>
          </div>
          {medic.payslips && medic.payslips.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="pb-3 text-left text-gray-400 font-medium">Pay Period</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Gross</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Deductions</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">Net</th>
                    <th className="pb-3 text-left text-gray-400 font-medium">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  {medic.payslips.map((payslip: any) => (
                    <tr key={payslip.id}>
                      <td className="py-3 text-gray-200">
                        {new Date(payslip.pay_period_start).toLocaleDateString('en-GB')} –{' '}
                        {new Date(payslip.pay_period_end).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 text-gray-200">£{payslip.gross_pay.toFixed(2)}</td>
                      <td className="py-3 text-gray-200">
                        £{(payslip.tax_deducted + payslip.ni_deducted).toFixed(2)}
                      </td>
                      <td className="py-3 text-white font-medium">£{payslip.net_pay.toFixed(2)}</td>
                      <td className="py-3">
                        {payslip.pdf_url ? (
                          <a
                            href={payslip.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-500">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No payslips yet</p>
          )}
        </div>

        {/* Admin Actions */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Admin Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              disabled={!isReadyForPayouts}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-500 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
            >
              {medic.available_for_work ? '✓ Approved for Work' : 'Approve for Work'}
            </button>
            <button className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-500 transition shadow-lg shadow-red-900/20">
              Suspend Medic
            </button>
            <Link
              href={`/admin/medics/${medicId}/payslips`}
              className="px-5 py-2.5 bg-gray-700 text-gray-200 rounded-xl font-medium hover:bg-gray-600 transition"
            >
              View Payslips
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${completed ? 'bg-green-900/20 border border-green-700/30' : 'bg-gray-700/30 border border-gray-700/30'}`}>
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
      )}
      <span className={`text-sm font-medium ${completed ? 'text-green-300' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

function StatusBadge({ completed }: { completed: boolean }) {
  return completed ? (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-green-900/50 text-green-300 border border-green-700/30 rounded-full text-xs font-medium">
      <CheckCircle2 className="w-3 h-3" /> Complete
    </span>
  ) : (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 rounded-full text-xs font-medium">
      <XCircle className="w-3 h-3" /> Incomplete
    </span>
  );
}

function InfoRow({ label, value, capitalize = false }: { label: string; value: string | null | undefined; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className={`text-gray-100 font-medium ${capitalize ? 'capitalize' : ''}`}>
        {value || <span className="text-gray-500 font-normal">Not provided</span>}
      </p>
    </div>
  );
}
