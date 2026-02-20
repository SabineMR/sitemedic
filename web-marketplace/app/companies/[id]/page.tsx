/**
 * Company Profile Page
 * Phase 34: Quote Submission & Comparison — Plan 02
 *
 * Route: /marketplace/companies/[companyId]
 *
 * Public-facing company profile page accessible from expanded quote rows.
 * Shows company overview, certifications, star rating, insurance/compliance
 * status, and reviews (placeholder for Phase 36).
 *
 * Contact details are hidden until the viewer has an awarded + deposit-paid
 * event with this company.
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Star,
  ShieldCheck,
  ShieldX,
  Phone,
  Mail,
  MapPin,
  Lock,
  ArrowLeft,
  Globe,
  Award,
  FileCheck,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface CompanyProfile {
  id: string;
  company_name: string;
  company_description: string | null;
  company_website: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_address: string | null;
  company_postcode: string | null;
  coverage_areas: string[] | null;
  admin_user_id: string;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  cqc_provider_id: string;
  cqc_registration_status: string;
  verification_status: string;
  rating: number;
  review_count: number;
  certifications: string[];
  can_view_contact: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function CompanyProfilePage() {
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Fetch company data
        const { data: companyData, error: companyError } = await supabase
          .from('marketplace_companies')
          .select(
            `
            id,
            company_name,
            company_description,
            company_website,
            company_phone,
            company_email,
            company_address,
            company_postcode,
            coverage_areas,
            admin_user_id,
            insurance_provider,
            insurance_policy_number,
            insurance_expiry,
            cqc_provider_id,
            cqc_registration_status,
            verification_status
          `
          )
          .eq('id', companyId)
          .single();

        if (companyError || !companyData) {
          setError('Company not found or you do not have access to view this profile.');
          setLoading(false);
          return;
        }

        // Check if user has a quote relationship with this company
        // (company submitted a quote on one of the viewer's events)
        let hasQuoteRelationship = false;
        let canViewContact = false;

        if (user) {
          // Is the viewer the company admin themselves?
          if (companyData.admin_user_id === user.id) {
            hasQuoteRelationship = true;
            canViewContact = true;
          } else {
            // Check if this company has submitted quotes on any of the viewer's events
            const { data: quotes } = await supabase
              .from('marketplace_quotes')
              .select('id, event_id')
              .eq('company_id', companyId)
              .neq('status', 'draft')
              .limit(1);

            if (quotes && quotes.length > 0) {
              // Verify viewer is the event poster for at least one of these events
              const eventIds = quotes.map((q: { event_id: string }) => q.event_id);
              const { data: events } = await supabase
                .from('marketplace_events')
                .select('id, status')
                .in('id', eventIds)
                .eq('posted_by', user.id)
                .limit(1);

              if (events && events.length > 0) {
                hasQuoteRelationship = true;
                // Contact visible if event awarded AND deposit paid
                // (deposit tracking in Phase 35 — for now, just check awarded status)
                const awardedEvent = events.find(
                  (e: { status: string }) => e.status === 'awarded'
                );
                canViewContact = !!awardedEvent; // Phase 35 adds deposit check
              }
            }
          }
        }

        // If no quote relationship exists, show limited profile
        if (!hasQuoteRelationship && user?.id !== companyData.admin_user_id) {
          setError(
            'This company profile is only viewable when they have submitted a quote on one of your events.'
          );
          setLoading(false);
          return;
        }

        setCompany({
          ...companyData,
          rating: 0, // Placeholder — Phase 36 adds ratings
          review_count: 0, // Placeholder
          certifications: [], // TODO: fetch from compliance_documents
          can_view_contact: canViewContact,
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to load company profile:', err);
        setError('Failed to load company profile.');
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  // =========================================================================
  // Loading
  // =========================================================================

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-5 w-32 mb-6" />
        <Skeleton className="h-10 w-72 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // Error / Not found
  // =========================================================================

  if (error || !company) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-700">{error || 'Company profile not available.'}</p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  const isInsuranceValid = company.insurance_expiry
    ? new Date(company.insurance_expiry) > new Date()
    : false;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <button
        type="button"
        onClick={() => window.history.back()}
        className="text-sm text-blue-600 hover:text-blue-800 mb-6 inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Quotes
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{company.company_name}</h1>
          {company.verification_status === 'verified' ? (
            <Badge className="gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-100">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs text-gray-500">
              {company.verification_status}
            </Badge>
          )}
        </div>

        {/* Star rating */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-4 w-4 ${
                  n <= Math.round(company.rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </span>
          <span className="text-sm text-gray-500">
            {company.rating.toFixed(1)} ({company.review_count} review
            {company.review_count !== 1 ? 's' : ''})
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Company Overview */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
          <div className="space-y-3 text-sm">
            {company.company_description ? (
              <p className="text-gray-700 whitespace-pre-wrap">{company.company_description}</p>
            ) : (
              <p className="text-gray-400 italic">No company description provided.</p>
            )}

            {company.company_website && (
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="h-4 w-4 text-gray-400" />
                <a
                  href={
                    company.company_website.startsWith('http')
                      ? company.company_website
                      : `https://${company.company_website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  {company.company_website}
                </a>
              </div>
            )}

            {company.coverage_areas && company.coverage_areas.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">Coverage Areas</span>
                <div className="flex flex-wrap gap-1">
                  {company.coverage_areas.map((area) => (
                    <Badge key={area} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Certifications & Qualifications */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Certifications & Qualifications
          </h2>
          <div className="space-y-3">
            {/* CQC Registration */}
            <div className="flex items-center gap-2">
              {company.cqc_registration_status === 'Registered' ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    CQC Registered (ID: {company.cqc_provider_id})
                  </span>
                </>
              ) : (
                <>
                  <ShieldX className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    CQC: {company.cqc_registration_status}
                  </span>
                </>
              )}
            </div>

            {/* Additional certifications */}
            {company.certifications.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {company.certifications.map((cert) => (
                  <Badge key={cert} variant="outline" className="gap-1 text-xs">
                    <Award className="h-3 w-3" />
                    {cert}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No additional certifications listed.
              </p>
            )}
          </div>
        </Card>

        {/* Insurance & Compliance */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Insurance & Compliance</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {company.insurance_provider ? (
                <>
                  <FileCheck
                    className={`h-5 w-5 ${isInsuranceValid ? 'text-green-600' : 'text-amber-500'}`}
                  />
                  <span className="text-sm text-gray-700">
                    {company.insurance_provider}
                    {company.insurance_expiry && (
                      <span className="text-gray-400 ml-1">
                        (Expires:{' '}
                        {new Date(company.insurance_expiry).toLocaleDateString('en-GB')})
                      </span>
                    )}
                  </span>
                  {!isInsuranceValid && company.insurance_expiry && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      Expired
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <ShieldX className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-400">Insurance details not provided</span>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Contact Details */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact Details</h2>
          {company.can_view_contact ? (
            <div className="space-y-2 text-sm">
              {company.company_phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${company.company_phone}`} className="hover:text-blue-600">
                    {company.company_phone}
                  </a>
                </div>
              )}
              {company.company_email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${company.company_email}`} className="hover:text-blue-600">
                    {company.company_email}
                  </a>
                </div>
              )}
              {company.company_address && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {company.company_address}
                  {company.company_postcode && `, ${company.company_postcode}`}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <Lock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Contact details will be available after the event is awarded and the deposit has been
                paid.
              </p>
            </div>
          )}
        </Card>

        {/* Reviews (Placeholder for Phase 36) */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Reviews</h2>
          <p className="text-sm text-gray-400 italic">
            Client reviews will be available in a future update. This company has{' '}
            {company.review_count} review{company.review_count !== 1 ? 's' : ''}.
          </p>
        </Card>

        {/* Past Events (Placeholder) */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Experience</h2>
          <p className="text-sm text-gray-400 italic">
            Past event completion history will be available in a future update.
          </p>
        </Card>
      </div>
    </div>
  );
}
