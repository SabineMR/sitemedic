/**
 * Medic Detail Page — Admin
 *
 * Full medic profile with editable compensation settings.
 * Accessible post-onboarding for ongoing rate management.
 *
 * Route: /admin/medics/[id]
 * Access: org_admin role only
 */

import { createClient } from '@/lib/supabase/server';
import { CompensationSettings } from '@/components/medics/compensation-settings';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Briefcase, FileText, CreditCard } from 'lucide-react';
import type { ExperienceLevel, MedicClassification } from '@/lib/medics/experience';

export default async function MedicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: medicId } = await params;
  const supabase = await createClient();

  const { data: medic, error } = await supabase
    .from('medics')
    .select('*')
    .eq('id', medicId)
    .single();

  if (error || !medic) {
    notFound();
  }

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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">
              {medic.first_name} {medic.last_name}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {medic.email} · {medic.phone || 'No phone'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/medics/${medicId}/onboarding`}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-600 transition"
            >
              Onboarding
            </Link>
            <Link
              href={`/admin/medics/${medicId}/payslips`}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-600 transition"
            >
              Payslips
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-5">
        {/* Personal Info */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Personal Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <InfoRow label="Name" value={`${medic.first_name} ${medic.last_name}`} />
            <InfoRow label="Email" value={medic.email} />
            <InfoRow label="Phone" value={medic.phone} />
            <InfoRow label="Home Postcode" value={medic.home_postcode} />
            <InfoRow label="Experience Level" value={medic.experience_level} capitalize />
            <InfoRow
              label="Status"
              value={medic.available_for_work ? 'Active' : 'Inactive'}
            />
          </div>
        </div>

        {/* Classification & Experience */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-teal-400" />
            Classification & Experience
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <InfoRow label="Classification" value={medic.classification?.replace(/_/g, ' ')} capitalize />
            <InfoRow label="Years Experience" value={medic.years_experience != null ? `${medic.years_experience} years` : null} />
            <InfoRow label="Hourly Rate" value={medic.hourly_rate != null ? `£${Number(medic.hourly_rate).toFixed(2)}/hr` : null} />
            <InfoRow label="Pay Model" value={medic.pay_model || 'percentage'} capitalize />
            <InfoRow label="CQC Number" value={medic.cqc_registration_number} />
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-400" />
            Qualifications
          </h2>
          {medic.qualifications && medic.qualifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {medic.qualifications.map((qual: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-blue-900/50 border border-blue-700/50 text-blue-300 rounded-full text-sm"
                >
                  {qual}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No qualifications recorded</p>
          )}
        </div>

        {/* Compensation & Mileage — Editable */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-400" />
              Compensation & Mileage
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Editable pay model, classification, and hourly rate
            </p>
          </div>
          <CompensationSettings
            medicId={medicId}
            initialLevel={(medic.experience_level ?? 'junior') as ExperienceLevel}
            medicName={`${medic.first_name} ${medic.last_name}`}
            initialPayModel={medic.pay_model || 'hourly'}
            initialClassification={(medic.classification ?? null) as MedicClassification | null}
            initialYearsExperience={medic.years_experience ?? 0}
            initialHourlyRate={medic.hourly_rate != null ? Number(medic.hourly_rate) : null}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, capitalize = false }: { label: string; value: string | null | undefined; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className={`text-gray-100 font-medium ${capitalize ? 'capitalize' : ''}`}>
        {value || <span className="text-gray-500 font-normal">Not set</span>}
      </p>
    </div>
  );
}
