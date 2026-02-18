/**
 * Medic Profile Page
 *
 * View personal details, IR35 status, availability toggle,
 * and Stripe payout onboarding status.
 * Shows certification expiry banners for certs expiring within 30 days.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { StripeOnboardingStatus } from '@/components/medics/stripe-onboarding-status';
import { User, CheckCircle2, XCircle, ToggleLeft, ToggleRight, AlertTriangle, ExternalLink, FileDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CERT_TYPE_METADATA, getRecommendedCertTypes } from '@/types/certification.types';
import { useOrg } from '@/contexts/org-context';

interface CertExpiry {
  type: string;
  expiry_date: string;
  cert_number: string;
  days_remaining: number;
}

function getExpiringCerts(certifications: Array<{ type: string; expiry_date: string; cert_number: string }> | null): {
  critical: CertExpiry[];
  warning: CertExpiry[];
} {
  const certs = certifications || [];
  const now = new Date();
  const critical: CertExpiry[] = [];
  const warning: CertExpiry[] = [];

  for (const cert of certs) {
    const expiry = new Date(cert.expiry_date);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      critical.push({ ...cert, days_remaining: daysLeft });
    } else if (daysLeft <= 7) {
      critical.push({ ...cert, days_remaining: daysLeft });
    } else if (daysLeft <= 30) {
      warning.push({ ...cert, days_remaining: daysLeft });
    }
  }

  return { critical, warning };
}

interface MedicData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  home_postcode: string | null;
  qualifications: string[] | null;
  certifications: Array<{ type: string; expiry_date: string; cert_number: string }> | null;
  employment_status: string | null;
  utr: string | null;
  umbrella_company_name: string | null;
  cest_assessment_result: string | null;
  cest_assessment_date: string | null;
  cest_pdf_url: string | null;
  available_for_work: boolean;
  star_rating: number | null;
  stripe_onboarding_complete: boolean;
}

export default function MedicProfilePage() {
  const [medic, setMedic] = useState<MedicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Org context for vertical-aware recommended certs
  const { industryVerticals } = useOrg();
  const primaryVertical = industryVerticals[0] ?? 'general';

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching medic profile:', error);
      } else {
        setMedic(data);
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  async function toggleAvailability() {
    if (!medic) return;
    setToggling(true);
    const supabase = createClient();
    const newValue = !medic.available_for_work;

    const { error } = await supabase
      .from('medics')
      .update({ available_for_work: newValue })
      .eq('id', medic.id);

    if (error) {
      toast.error('Failed to update availability');
    } else {
      setMedic((prev) => prev ? { ...prev, available_for_work: newValue } : prev);
      toast.success(newValue ? 'You are now available for work' : 'You are now unavailable');
    }
    setToggling(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!medic) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-6 text-center">
          <p className="text-red-300">Profile not found. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  const { critical, warning } = getExpiringCerts(medic.certifications);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-gray-400 mt-1">Your account details and preferences</p>
      </div>

      {/* Critical Certification Banners (expired or expiring in <=7 days) */}
      {critical.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            Urgent: Certification{critical.length > 1 ? 's' : ''} Expiring
          </div>
          {critical.map((cert) => {
            const renewalUrl = CERT_TYPE_METADATA[cert.type as keyof typeof CERT_TYPE_METADATA]?.renewalUrl;
            return (
              <div key={cert.cert_number} className="flex items-center justify-between text-sm">
                <span className="text-red-300">
                  {cert.type} {cert.days_remaining <= 0
                    ? 'has EXPIRED'
                    : `expires in ${cert.days_remaining} day${cert.days_remaining !== 1 ? 's' : ''}`}
                </span>
                {renewalUrl && (
                  <a href={renewalUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 underline text-sm">
                    Renew now <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warning Certification Banners (expiring in 8-30 days) */}
      {warning.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            Certification{warning.length > 1 ? 's' : ''} Expiring Soon
          </div>
          {warning.map((cert) => {
            const renewalUrl = CERT_TYPE_METADATA[cert.type as keyof typeof CERT_TYPE_METADATA]?.renewalUrl;
            return (
              <div key={cert.cert_number} className="flex items-center justify-between text-sm">
                <span className="text-yellow-300">
                  {cert.type} expires in {cert.days_remaining} day{cert.days_remaining !== 1 ? 's' : ''}
                </span>
                {renewalUrl && (
                  <a href={renewalUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 underline text-sm">
                    Renew now <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Availability Toggle */}
      <div className={`flex items-center justify-between p-5 rounded-2xl border ${
        medic.available_for_work
          ? 'bg-green-900/20 border-green-700/30'
          : 'bg-gray-800/50 border-gray-700/50'
      }`}>
        <div>
          <p className="text-white font-semibold">Available for Work</p>
          <p className="text-gray-400 text-sm mt-0.5">
            {medic.available_for_work
              ? 'You are visible to the scheduling team'
              : 'You are currently marked as unavailable'}
          </p>
        </div>
        <button
          onClick={toggleAvailability}
          disabled={toggling}
          className="flex items-center gap-2 transition-all"
        >
          {medic.available_for_work ? (
            <ToggleRight className="w-12 h-12 text-green-400" />
          ) : (
            <ToggleLeft className="w-12 h-12 text-gray-500" />
          )}
        </button>
      </div>

      {/* Personal Info */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-green-400" />
          <h2 className="text-white font-semibold text-lg">Personal Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Full Name" value={`${medic.first_name} ${medic.last_name}`} />
          <InfoRow label="Email" value={medic.email} />
          <InfoRow label="Phone" value={medic.phone} />
          <InfoRow label="Home Postcode" value={medic.home_postcode} />
          <InfoRow
            label="Star Rating"
            value={medic.star_rating ? `${medic.star_rating.toFixed(1)} ★` : 'No ratings yet'}
          />
        </div>
      </div>

      {/* Qualifications */}
      {medic.qualifications && medic.qualifications.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Qualifications</h2>
          <div className="flex flex-wrap gap-2">
            {medic.qualifications.map((qual, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/50 border border-blue-700/50 text-blue-300 rounded-full text-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {qual}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {(medic.certifications || []).length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Certifications</h2>
          <div className="space-y-3">
            {(medic.certifications || []).map((cert) => {
              const expiry = new Date(cert.expiry_date);
              const daysLeft = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isExpired = daysLeft <= 0;
              const isWarning = daysLeft > 0 && daysLeft <= 30;
              return (
                <div key={cert.cert_number} className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium">{cert.type}</span>
                    <span className="text-gray-500 text-sm ml-2">#{cert.cert_number}</span>
                  </div>
                  <span className={`text-sm ${isExpired ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400'}`}>
                    {isExpired ? 'Expired' : `Expires ${format(expiry, 'dd MMM yyyy')}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended Certifications — shown for non-general verticals */}
      {primaryVertical !== 'general' && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-1">Recommended Certifications</h2>
          <p className="text-gray-400 text-sm mb-4">Priority certifications for your organisation&apos;s vertical</p>
          <div className="flex flex-wrap gap-2">
            {getRecommendedCertTypes(primaryVertical).slice(0, 6).map((certType) => {
              const held = (medic.certifications || []).some((c) => c.type === certType);
              const meta = CERT_TYPE_METADATA[certType as keyof typeof CERT_TYPE_METADATA];
              return (
                <span
                  key={certType}
                  title={meta?.description}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${
                    held
                      ? 'bg-green-900/50 border-green-700/50 text-green-300'
                      : 'bg-gray-700/50 border-gray-600/50 text-gray-400'
                  }`}
                >
                  {held && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {meta?.label ?? certType}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* IR35 Status */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
        <h2 className="text-white font-semibold text-lg mb-4">IR35 Status</h2>
        {medic.employment_status ? (
          <div className="space-y-4">
            {/* Employment status banner */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm ${
              medic.employment_status === 'umbrella'
                ? 'bg-purple-900/50 border border-purple-700/50 text-purple-300'
                : 'bg-blue-900/50 border border-blue-700/50 text-blue-300'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              {medic.employment_status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>

            {/* Assessment date */}
            {medic.cest_assessment_date && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                Last assessed {format(new Date(medic.cest_assessment_date), 'dd MMM yyyy')}
              </div>
            )}

            {/* CEST PDF download */}
            {medic.cest_pdf_url && (
              <a
                href={medic.cest_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 text-gray-200 rounded-xl text-sm transition-colors"
              >
                <FileDown className="w-4 h-4 text-green-400" />
                Download CEST PDF
              </a>
            )}

            {/* Detail rows */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {medic.employment_status === 'self_employed' && medic.utr && (
                <InfoRow label="UTR" value={medic.utr} />
              )}
              {medic.employment_status === 'umbrella' && medic.umbrella_company_name && (
                <InfoRow label="Umbrella Company" value={medic.umbrella_company_name} />
              )}
              {medic.cest_assessment_result && (
                <InfoRow
                  label="HMRC CEST Result"
                  value={medic.cest_assessment_result.replace(/_/g, ' ')}
                  capitalize
                />
              )}
              {medic.cest_assessment_date && (
                <InfoRow
                  label="Assessment Date"
                  value={format(new Date(medic.cest_assessment_date), 'dd MMM yyyy')}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <XCircle className="w-4 h-4" />
            IR35 status not yet submitted — contact your administrator
          </div>
        )}
      </div>

      {/* Stripe Payout Setup */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
        <h2 className="text-white font-semibold text-lg mb-4">Payout Account (Stripe)</h2>
        <StripeOnboardingStatus medicId={medic.id} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, capitalize = false }: {
  label: string;
  value: string | null | undefined;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className={`text-gray-100 font-medium ${capitalize ? 'capitalize' : ''}`}>
        {value ?? <span className="text-gray-500 font-normal">Not provided</span>}
      </p>
    </div>
  );
}
