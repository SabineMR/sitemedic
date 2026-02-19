import { createClient } from '@/lib/supabase/server';
import { StripeOnboardingStatus } from '@/components/medics/stripe-onboarding-status';
import { IR35SectionClient } from '@/components/medics/ir35-section-client';
import { notFound } from 'next/navigation';

export default async function MedicOnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: medicId } = await params;
  const supabase = await createClient();

  // Fetch medic data
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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {medic.first_name} {medic.last_name} - Onboarding
        </h1>
        <p className="text-gray-600 mt-1">Complete all sections to enable payouts for this medic</p>
      </div>

      {/* Onboarding Checklist */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboarding Checklist</h2>
        <div className="space-y-3">
          <ChecklistItem label="Personal details" completed={hasPersonalDetails} />
          <ChecklistItem label="Qualifications" completed={hasQualifications} />
          <ChecklistItem label="IR35 status" completed={hasIR35Status} />
          <ChecklistItem label="Stripe Express account" completed={hasStripeAccount} />
          <ChecklistItem label="Ready for payouts" completed={isReadyForPayouts} highlight />
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{medic.first_name} {medic.last_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{medic.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Phone</p>
            <p className="font-medium text-gray-900">{medic.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-gray-500">Home Postcode</p>
            <p className="font-medium text-gray-900">{medic.home_postcode || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Qualifications */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Qualifications</h2>
        {medic.qualifications && medic.qualifications.length > 0 ? (
          <div className="space-y-2">
            {medic.qualifications.map((qual: string, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-900">{qual}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No qualifications recorded</p>
        )}
      </div>

      {/* IR35 Compliance */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">IR35 Compliance</h2>
        <IR35SectionClient medicId={medicId} hasIR35Status={hasIR35Status}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Employment Status</p>
                <p className="font-medium text-gray-900 capitalize">
                  {medic.employment_status?.replace('_', ' ')}
                </p>
              </div>
              {medic.employment_status === 'self_employed' && (
                <>
                  <div>
                    <p className="text-gray-500">UTR</p>
                    <p className="font-medium text-gray-900">{medic.utr || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CEST Assessment</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {medic.cest_assessment_result?.replace('_', ' ') || 'Not provided'}
                    </p>
                  </div>
                  {medic.cest_pdf_url && (
                    <div>
                      <p className="text-gray-500">CEST PDF</p>
                      <a
                        href={medic.cest_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Download PDF
                      </a>
                    </div>
                  )}
                </>
              )}
              {medic.employment_status === 'umbrella' && (
                <div>
                  <p className="text-gray-500">Umbrella Company</p>
                  <p className="font-medium text-gray-900">{medic.umbrella_company_name || 'Not provided'}</p>
                </div>
              )}
            </div>
          </div>
        </IR35SectionClient>
      </div>

      {/* Payout Setup */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Payout Setup</h2>
        <StripeOnboardingStatus medicId={medicId} />
      </div>

      {/* Payslip History */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Payslip History</h2>
        {medic.payslips && medic.payslips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium text-gray-900">Pay Period</th>
                  <th className="pb-3 font-medium text-gray-900">Gross</th>
                  <th className="pb-3 font-medium text-gray-900">Deductions</th>
                  <th className="pb-3 font-medium text-gray-900">Net</th>
                  <th className="pb-3 font-medium text-gray-900">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {medic.payslips.map((payslip: any) => (
                  <tr key={payslip.id}>
                    <td className="py-3 text-gray-900">
                      {new Date(payslip.pay_period_start).toLocaleDateString('en-GB')} - {new Date(payslip.pay_period_end).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 text-gray-900">£{payslip.gross_pay.toFixed(2)}</td>
                    <td className="py-3 text-gray-900">£{(payslip.tax_deducted + payslip.ni_deducted).toFixed(2)}</td>
                    <td className="py-3 text-gray-900 font-medium">£{payslip.net_pay.toFixed(2)}</td>
                    <td className="py-3">
                      {payslip.pdf_url ? (
                        <a href={payslip.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Actions</h2>
        <div className="flex gap-3">
          <button
            disabled={!isReadyForPayouts}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {medic.available_for_work ? 'Approved for Work' : 'Approve for Work'}
          </button>
          <button className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition">
            Suspend
          </button>
          <a
            href={`/admin/medics/${medicId}/payouts`}
            className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition"
          >
            View Payout History
          </a>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ label, completed, highlight = false }: { label: string; completed: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${highlight ? (completed ? 'bg-green-50' : 'bg-red-50') : 'bg-gray-50'}`}>
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${completed ? 'bg-green-600' : 'bg-gray-300'}`}>
        {completed && (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`font-medium ${completed ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
    </div>
  );
}
