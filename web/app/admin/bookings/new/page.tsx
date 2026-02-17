/**
 * Admin New Booking Page
 *
 * Admin-side form to create a booking on behalf of a client.
 * Posts to /api/bookings/create then redirects to /admin/bookings.
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarPlus, ArrowLeft, MapPin, Clock, Users, FileText } from 'lucide-react';
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

const SHIFT_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientEmail: searchParams.get('clientEmail') ?? '',
    siteName: '',
    siteAddress: searchParams.get('siteAddress') ?? '',
    sitePostcode: '',
    siteContactName: '',
    siteContactPhone: '',
    shiftDate: searchParams.get('shiftDate') ?? '',
    shiftStartTime: '07:00',
    shiftEndTime: '19:00',
    qualification: 'paramedic',
    confinedSpace: searchParams.get('confinedSpace') === '1',
    traumaSpecialist: searchParams.get('traumaSpecialist') === '1',
    specialNotes: searchParams.get('specialNotes') ?? '',
  });

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          shiftDate: new Date(form.shiftDate),
          isAdminCreated: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create booking');
      }

      router.push('/admin/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/bookings"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <CalendarPlus className="w-8 h-8 text-blue-400" />
              New Booking
            </h1>
            <p className="text-gray-400 text-sm mt-1">Create a shift booking on behalf of a client</p>
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

          {/* Client */}
          <section className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Client
            </h2>
            <div>
              <Label className="text-gray-300">Client Email</Label>
              <Input
                type="email"
                required
                value={form.clientEmail}
                onChange={(e) => set('clientEmail', e.target.value)}
                placeholder="client@company.co.uk"
                className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
              />
            </div>
          </section>

          {/* Site Location */}
          <section className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-400" />
              Site Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Site Name</Label>
                <Input
                  required
                  value={form.siteName}
                  onChange={(e) => set('siteName', e.target.value)}
                  placeholder="e.g. Westminster Tower Project"
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300">Postcode</Label>
                <Input
                  required
                  value={form.sitePostcode}
                  onChange={(e) => set('sitePostcode', e.target.value.toUpperCase())}
                  placeholder="SW1A 1AA"
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-gray-300">Full Address</Label>
                <Input
                  required
                  value={form.siteAddress}
                  onChange={(e) => set('siteAddress', e.target.value)}
                  placeholder="1 Parliament Square, London"
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300">Site Contact Name</Label>
                <Input
                  required
                  value={form.siteContactName}
                  onChange={(e) => set('siteContactName', e.target.value)}
                  placeholder="John Smith"
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300">Site Contact Phone</Label>
                <Input
                  type="tel"
                  required
                  value={form.siteContactPhone}
                  onChange={(e) => set('siteContactPhone', e.target.value)}
                  placeholder="+44 7700 900000"
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
            </div>
          </section>

          {/* Shift Details */}
          <section className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Shift Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">Date</Label>
                <Input
                  type="date"
                  required
                  value={form.shiftDate}
                  onChange={(e) => set('shiftDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1.5 bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Start Time</Label>
                <Select value={form.shiftStartTime} onValueChange={(v) => set('shiftStartTime', v)}>
                  <SelectTrigger className="mt-1.5 bg-gray-900/50 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_TIMES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">End Time</Label>
                <Select value={form.shiftEndTime} onValueChange={(v) => set('shiftEndTime', v)}>
                  <SelectTrigger className="mt-1.5 bg-gray-900/50 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_TIMES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Required Qualification</Label>
              <Select value={form.qualification} onValueChange={(v) => set('qualification', v)}>
                <SelectTrigger className="mt-1.5 bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_aider">First Aider</SelectItem>
                  <SelectItem value="emt">EMT</SelectItem>
                  <SelectItem value="paramedic">Paramedic</SelectItem>
                  <SelectItem value="senior_paramedic">Senior Paramedic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.confinedSpace}
                  onChange={(e) => set('confinedSpace', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-500"
                />
                Confined Space Required
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.traumaSpecialist}
                  onChange={(e) => set('traumaSpecialist', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-500"
                />
                Trauma Specialist Required
              </label>
            </div>
          </section>

          {/* Notes */}
          <section className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-400" />
              Additional Notes
            </h2>
            <textarea
              value={form.specialNotes}
              onChange={(e) => set('specialNotes', e.target.value)}
              rows={3}
              placeholder="Site-specific requirements, access codes, hazards..."
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/admin/bookings">
              <Button type="button" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-8"
            >
              {submitting ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <NewBookingForm />
    </Suspense>
  );
}
