/**
 * Admin Add New Medic Page
 *
 * Form to onboard a new medic: personal details, qualifications,
 * territory preference, and IR35 status. Creates a profile and
 * sends a magic-link invitation email.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowLeft, User, ShieldCheck, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';

export default function NewMedicPage() {
  const router = useRouter();
  const { orgId } = useOrg();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: 'Kai Aufmkolk',
    email: 'firstcontactsolutions.intl@gmail.com',
    phone: '+44 7584 639688',
    qualificationLevel: 'paramedic',
    confinedSpaceCert: false,
    traumaSpecialist: false,
    drivingLicence: true,
    ownVehicle: false,
    ir35Status: 'outside',
    notes: '10 years experience',
  });

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase.from('medics').insert({
        org_id: orgId,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        qualification_level: form.qualificationLevel,
        confined_space_certified: form.confinedSpaceCert,
        trauma_specialist: form.traumaSpecialist,
        driving_licence: form.drivingLicence,
        own_vehicle: form.ownVehicle,
        ir35_status: form.ir35Status,
        notes: form.notes,
        status: 'pending_onboarding',
      });

      if (insertError) throw new Error(insertError.message);

      router.push('/admin/medics');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medic');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-center gap-4">
          <Link href="/admin/medics" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-blue-400" />
              Add New Medic
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Register a new medic and add them to your roster
            </p>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Personal Details */}
          <section className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Personal Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-gray-300">Full Name</Label>
                <Input
                  required
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  placeholder="Jane Smith"
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300">Email Address</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="jane@example.co.uk"
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300">Phone Number</Label>
                <Input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+44 7700 900000"
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
            </div>
          </section>

          {/* Qualifications */}
          <section className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              Qualifications
            </h2>
            <div>
              <Label className="text-gray-300">Qualification Level</Label>
              <Select
                value={form.qualificationLevel}
                onValueChange={(v) => set('qualificationLevel', v)}
              >
                <SelectTrigger className="mt-1.5 bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_aider">First Aider</SelectItem>
                  <SelectItem value="emt">Emergency Medical Technician (EMT)</SelectItem>
                  <SelectItem value="paramedic">Paramedic</SelectItem>
                  <SelectItem value="senior_paramedic">Senior Paramedic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
              {[
                { key: 'confinedSpaceCert', label: 'Confined Space Certified' },
                { key: 'traumaSpecialist', label: 'Trauma Specialist' },
                { key: 'drivingLicence', label: 'Full Driving Licence' },
                { key: 'ownVehicle', label: 'Own Vehicle' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => set(key, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {/* IR35 Status */}
          <section className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-yellow-400" />
              IR35 & Engagement
            </h2>
            <div>
              <Label className="text-gray-300">IR35 Status</Label>
              <Select value={form.ir35Status} onValueChange={(v) => set('ir35Status', v)}>
                <SelectTrigger className="mt-1.5 bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outside">Outside IR35 (Self-employed)</SelectItem>
                  <SelectItem value="inside">Inside IR35 (PAYE)</SelectItem>
                  <SelectItem value="umbrella">Umbrella Company</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1.5">
                Full IR35 assessment available in the medic profile after creation.
              </p>
            </div>
          </section>

          {/* Notes */}
          <section className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-400" />
              Internal Notes
            </h2>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Any notes about this medic (visible to admins only)..."
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/admin/medics">
              <Button type="button" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-8"
            >
              {submitting ? 'Adding...' : 'Add Medic'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
