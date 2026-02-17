/**
 * Certifications Dashboard Page
 * Phase 7: Certification Tracking - Plan 03
 *
 * Shows certification compliance overview with summary cards and tabbed expiry view.
 */

'use client';

import { useState } from 'react';
import { useCertificationSummary, useExpiringCertifications } from '@/lib/queries/admin/certifications';
import { CertificationStatusBadge } from '@/components/dashboard/certification-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function CertificationsPage() {
  const [activeTab, setActiveTab] = useState<'30' | '60' | '90' | 'expired'>('30');

  // Fetch certification summary
  const { data: summary = [], isLoading: summaryLoading } = useCertificationSummary();

  // Fetch expiring certs for active tab
  const daysWindow = activeTab === 'expired' ? -1 : parseInt(activeTab);
  const { data: expiringCerts = [], isLoading: expiringLoading } = useExpiringCertifications(daysWindow);

  // Calculate summary stats
  const totalMedics = summary.length;
  const nonCompliantCount = summary.filter(m => m.status === 'non-compliant').length;
  const atRiskCount = summary.filter(m => m.status === 'at-risk').length;
  const compliantCount = summary.filter(m => m.status === 'compliant').length;
  const complianceRate = totalMedics > 0
    ? Math.round((compliantCount / totalMedics) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Certification Compliance</h1>
        <p className="text-muted-foreground">
          {totalMedics} medics tracked • {complianceRate}% compliant
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{nonCompliantCount}</div>
            <p className="text-xs text-muted-foreground">
              Non-compliant medics
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{atRiskCount}</div>
            <p className="text-xs text-muted-foreground">
              At-risk (within 30 days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{compliantCount}</div>
            <p className="text-xs text-muted-foreground">
              All certifications valid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Certifications Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Expiring Certifications</CardTitle>
          <CardDescription>
            Track certifications by expiry window
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="60">60 Days</TabsTrigger>
              <TabsTrigger value="90">90 Days</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {expiringLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading certifications...
                </div>
              ) : expiringCerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {activeTab === 'expired'
                      ? 'No expired certifications'
                      : `No certifications expiring in the next ${activeTab} days`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-sm">Medic Name</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Certification Type</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Certificate Number</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Expiry Date</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Days Remaining</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringCerts.map((cert, index) => (
                        <tr key={`${cert.medic_id}-${cert.cert_type}-${index}`} className="border-b hover:bg-accent">
                          <td className="py-3 px-4 text-sm">{cert.medic_name}</td>
                          <td className="py-3 px-4 text-sm">{cert.cert_type}</td>
                          <td className="py-3 px-4 text-sm font-mono text-xs">
                            {cert.cert_number}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {format(parseISO(cert.expiry_date), 'dd MMM yyyy')}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {cert.days_remaining < 0
                              ? <span className="text-red-600 font-medium">
                                  {Math.abs(cert.days_remaining)} days ago
                                </span>
                              : <span className={cert.days_remaining <= 7 ? 'text-red-600 font-medium' : cert.days_remaining <= 30 ? 'text-amber-600' : ''}>
                                  {cert.days_remaining} days
                                </span>
                            }
                          </td>
                          <td className="py-3 px-4">
                            <CertificationStatusBadge expiryDate={cert.expiry_date} showDays={false} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
