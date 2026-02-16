/**
 * Admin Medic Onboarding Page
 * Phase 6.5: IR35 Compliance - Plan 04
 */

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { IR35Form } from '@/components/medics/ir35-form';
import { StripeOnboardingStatus } from '@/components/medics/stripe-onboarding-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle, XCircle, Download } from 'lucide-react';

export default function MedicOnboardingPage() {
  const params = useParams();
  const medicId = params.id as string;
  const queryClient = useQueryClient();
  const [approvingMedic, setApprovingMedic] = useState(false);

  // Fetch medic data
  const { data: medic, isLoading } = useQuery({
    queryKey: ['medic-onboarding', medicId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('medics')
        .select(`
          *,
          payslips (
            id,
            pay_period_start,
            pay_period_end,
            payment_date,
            gross_pay,
            tax_deducted,
            ni_deducted,
            net_pay,
            employment_status,
            pdf_url
          )
        `)
        .eq('id', medicId)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds to check onboarding status
  });

  const handleIR35Complete = () => {
    // Refresh medic data
    queryClient.invalidateQueries({ queryKey: ['medic-onboarding', medicId] });
  };

  const handleApproveMedic = async () => {
    setApprovingMedic(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('medics')
      .update({ available_for_work: true })
      .eq('id', medicId);

    if (error) {
      console.error('Error approving medic:', error);
      alert('Failed to approve medic');
    } else {
      queryClient.invalidateQueries({ queryKey: ['medic-onboarding', medicId] });
    }

    setApprovingMedic(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">Loading medic onboarding details...</div>
      </div>
    );
  }

  if (!medic) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          Medic not found
        </div>
      </div>
    );
  }

  // Onboarding checklist calculations
  const hasPersonalDetails = medic.first_name && medic.last_name && medic.email && medic.phone && medic.home_address;
  const hasQualifications = medic.has_confined_space_cert || medic.has_trauma_cert || (medic.certifications && medic.certifications.length > 0);
  const hasIR35Status = medic.employment_status && (
    (medic.employment_status === 'self_employed' && medic.utr) ||
    (medic.employment_status === 'umbrella' && medic.umbrella_company_name)
  );
  const hasStripeAccount = medic.stripe_account_id && medic.stripe_onboarding_complete;
  const readyForPayouts = hasPersonalDetails && hasQualifications && hasIR35Status && hasStripeAccount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/medics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Medic Onboarding</h1>
          <p className="text-muted-foreground">
            {medic.first_name} {medic.last_name} - {medic.email}
          </p>
        </div>
        {readyForPayouts && !medic.available_for_work && (
          <Button onClick={handleApproveMedic} disabled={approvingMedic}>
            {approvingMedic ? 'Approving...' : 'Approve for Work'}
          </Button>
        )}
        {medic.available_for_work && (
          <Badge className="bg-green-600">Approved for Work</Badge>
        )}
      </div>

      {/* Onboarding Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Checklist</CardTitle>
          <CardDescription>Complete all steps to approve medic for work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {hasPersonalDetails ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={hasPersonalDetails ? 'text-green-900' : 'text-red-900'}>
              Personal details (name, email, phone, address)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasQualifications ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={hasQualifications ? 'text-green-900' : 'text-red-900'}>
              Qualifications (certifications, confined space, trauma)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasIR35Status ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={hasIR35Status ? 'text-green-900' : 'text-red-900'}>
              IR35 status (employment status, UTR/umbrella company)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasStripeAccount ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={hasStripeAccount ? 'text-green-900' : 'text-red-900'}>
              Stripe Express account (onboarding complete)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {readyForPayouts ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={readyForPayouts ? 'text-green-900 font-semibold' : 'text-red-900'}>
              Ready for payouts (all above complete)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-600">Name</p>
            <p className="font-medium">{medic.first_name} {medic.last_name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Email</p>
            <p className="font-medium">{medic.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Phone</p>
            <p className="font-medium">{medic.phone}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Address</p>
            <p className="font-medium">{medic.home_address}, {medic.home_postcode}</p>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle>Qualifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {medic.has_confined_space_cert ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-slate-400" />
              )}
              <span>Confined Space Certification</span>
            </div>
            <div className="flex items-center gap-2">
              {medic.has_trauma_cert ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-slate-400" />
              )}
              <span>Trauma Specialist Certification</span>
            </div>
            {medic.certifications && medic.certifications.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Additional Certifications:</p>
                <ul className="list-disc list-inside text-sm text-slate-700">
                  {medic.certifications.map((cert: any, idx: number) => (
                    <li key={idx}>
                      {cert.type} - Expires: {cert.expiry_date} - Cert #: {cert.cert_number}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* IR35 Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>IR35 Compliance</CardTitle>
          <CardDescription>Employment status and tax compliance</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasIR35Status ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Medic needs to complete IR35 assessment before receiving payouts.
                </AlertDescription>
              </Alert>
              <IR35Form medicId={medicId} onComplete={handleIR35Complete} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-md border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">IR35 Status Complete</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">Employment Status</p>
                    <p className="font-medium capitalize">
                      {medic.employment_status === 'self_employed' ? 'Self-Employed Contractor' : 'Umbrella Company Employee'}
                    </p>
                  </div>
                  {medic.employment_status === 'self_employed' && (
                    <>
                      <div>
                        <p className="text-slate-600">UTR</p>
                        <p className="font-medium">{medic.utr}</p>
                      </div>
                      {medic.cest_assessment_result && (
                        <div>
                          <p className="text-slate-600">CEST Assessment</p>
                          <p className="font-medium capitalize">{medic.cest_assessment_result.replace('_', ' ')}</p>
                        </div>
                      )}
                      {medic.cest_pdf_url && (
                        <div>
                          <p className="text-slate-600">CEST PDF</p>
                          <a href={medic.cest_pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            Download Assessment
                          </a>
                        </div>
                      )}
                    </>
                  )}
                  {medic.employment_status === 'umbrella' && (
                    <div>
                      <p className="text-slate-600">Umbrella Company</p>
                      <p className="font-medium">{medic.umbrella_company_name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Setup</CardTitle>
          <CardDescription>Stripe Express account for receiving payments</CardDescription>
        </CardHeader>
        <CardContent>
          <StripeOnboardingStatus medicId={medicId} />
        </CardContent>
      </Card>

      {/* Payslip History */}
      <Card>
        <CardHeader>
          <CardTitle>Payslip History</CardTitle>
          <CardDescription>Past payouts and payslips</CardDescription>
        </CardHeader>
        <CardContent>
          {medic.payslips && medic.payslips.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Pay Period</th>
                    <th className="text-left py-2">Payment Date</th>
                    <th className="text-right py-2">Gross</th>
                    <th className="text-right py-2">Deductions</th>
                    <th className="text-right py-2">Net</th>
                    <th className="text-center py-2">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {medic.payslips.map((payslip: any) => (
                    <tr key={payslip.id} className="border-b">
                      <td className="py-2">
                        {new Date(payslip.pay_period_start).toLocaleDateString('en-GB')} -{' '}
                        {new Date(payslip.pay_period_end).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2">{new Date(payslip.payment_date).toLocaleDateString('en-GB')}</td>
                      <td className="text-right py-2">£{payslip.gross_pay.toFixed(2)}</td>
                      <td className="text-right py-2">£{(payslip.tax_deducted + payslip.ni_deducted).toFixed(2)}</td>
                      <td className="text-right py-2 font-medium">£{payslip.net_pay.toFixed(2)}</td>
                      <td className="text-center py-2">
                        {payslip.pdf_url ? (
                          <a href={payslip.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            <Download className="h-4 w-4 inline" />
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-600 text-center py-4">No payslips yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
