'use client';

/**
 * BookingBriefForm
 *
 * Pre-event medical brief / Event Medical Plan form.
 * Renders common fields (A&E, helicopter LZ, rendezvous, on-site contact, hazards)
 * plus a vertical-specific section that adapts to the booking's event type.
 *
 * Data is fetched from and saved to /api/admin/bookings/[id]/brief.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, CheckCircle2, Clock, AlertTriangle,
  Hospital, Helicopter, MapPin, Phone, ShieldAlert,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BriefData {
  id: string | null;
  booking_id: string;
  nearest_ae_name: string | null;
  nearest_ae_address: string | null;
  ae_travel_minutes: number | null;
  helicopter_lz: string | null;
  emergency_rendezvous: string | null;
  on_site_contact_name: string | null;
  on_site_contact_phone: string | null;
  known_hazards: string | null;
  extra_fields: Record<string, unknown>;
  status: 'not_started' | 'in_progress' | 'complete';
  completed_at: string | null;
}

interface ExtraField {
  key: string;
  label: string;
  type: 'text' | 'tel' | 'number' | 'boolean' | 'textarea';
  placeholder?: string;
  hint?: string;
}

// ── Vertical-specific extra fields ───────────────────────────────────────────

const EXTRA_FIELDS: Record<string, ExtraField[]> = {
  construction: [
    { key: 'site_supervisor_name',  label: 'Site Supervisor Name',          type: 'text',    placeholder: 'Name of site supervisor on duty' },
    { key: 'site_supervisor_phone', label: 'Site Supervisor Phone',          type: 'tel',     placeholder: '+44 7700 900000' },
    { key: 'method_statement_ref',  label: 'Method Statement Reference',     type: 'text',    placeholder: 'e.g. MS-2024-001', hint: 'Reference of relevant method statement / risk assessment.' },
    { key: 'hse_notifiable',        label: 'HSE-Notifiable Work on Site?',   type: 'boolean', hint: 'Flag if CDM F10 notification applies.' },
    { key: 'ppe_requirements',      label: 'PPE Required for Medic',         type: 'text',    placeholder: 'e.g. Hard hat, hi-vis, safety boots, gloves' },
  ],

  tv_film: [
    { key: 'production_coordinator_name',  label: 'Production Coordinator Name',  type: 'text',    placeholder: 'On-set coordinator name' },
    { key: 'production_coordinator_phone', label: 'Production Coordinator Phone', type: 'tel',     placeholder: '+44 7700 900000' },
    { key: 'stunt_coordinator_name',       label: 'Stunt Coordinator (if applicable)', type: 'text', placeholder: 'Leave blank if no stunt work' },
    { key: 'pyrotechnics_on_set',          label: 'Pyrotechnics / SFX on Set?',   type: 'boolean', hint: 'If yes, confirm SFX supervisor contact is known.' },
    { key: 'nearest_water_source',         label: 'Nearest Water Source on Set',  type: 'text',    placeholder: 'e.g. Props truck row B, fire point near Stage 3' },
    { key: 'insurance_reference',          label: 'Production Insurance Reference', type: 'text',  placeholder: 'Policy or certificate number' },
  ],

  motorsport: [
    { key: 'race_control_channel',  label: 'Race Control Radio Channel',    type: 'text',    placeholder: 'e.g. Channel 4 — Race Control' },
    { key: 'circuit_map_available', label: 'Circuit Map Received?',         type: 'boolean', hint: 'Confirm medic has reviewed the circuit / stage map.' },
    { key: 'cmo_letter_ref',        label: 'CMO Appointment Letter Reference', type: 'text', placeholder: 'Motorsport UK CMO letter ref' },
    { key: 'flag_signals_briefed',  label: 'Flag Signal Briefing Completed?', type: 'boolean', hint: 'Medic should attend race director flag signal briefing.' },
    { key: 'extraction_lead_name',  label: 'Extraction Team Lead Name',     type: 'text',    placeholder: 'Name of extrication lead' },
    { key: 'extraction_lead_phone', label: 'Extraction Team Lead Phone',    type: 'tel',     placeholder: '+44 7700 900000' },
  ],

  festivals: [
    { key: 'mip_reference',          label: 'Major Incident Plan Reference',  type: 'text',    placeholder: 'MIP document ref / version number' },
    { key: 'crowd_capacity',         label: 'Crowd Capacity (people)',         type: 'number',  placeholder: '5000', hint: 'Maximum attendee number per the event licence.' },
    { key: 'stage_map_reference',    label: 'Site / Stage Map Reference',     type: 'text',    placeholder: 'Map version or shared drive link' },
    { key: 'drug_welfare_protocol',  label: 'Drug Welfare Protocol in Place?', type: 'boolean', hint: 'e.g. The Loop harm reduction team, welfare tent protocol.' },
    { key: 'festival_director_name', label: 'Festival Director / Safety Officer Name', type: 'text', placeholder: 'On-site safety lead' },
    { key: 'festival_director_phone', label: 'Festival Director Phone',        type: 'tel',     placeholder: '+44 7700 900000' },
  ],

  sporting_events: [
    { key: 'match_commander_name',   label: 'Match Commander / Safety Officer', type: 'text',  placeholder: 'Event safety officer name' },
    { key: 'match_commander_phone',  label: 'Match Commander Phone',           type: 'tel',    placeholder: '+44 7700 900000' },
    { key: 'doping_control_officer', label: 'Doping Control Officer (if applicable)', type: 'text', placeholder: 'DCO name — leave blank if not applicable' },
    { key: 'evacuation_plan_ref',    label: 'Evacuation Plan Reference',       type: 'text',   placeholder: 'Stadium / venue evacuation plan ref' },
    { key: 'governing_body_contact', label: 'Governing Body Representative',  type: 'text',   placeholder: 'FA / governing body contact on the day' },
  ],

  fairs_shows: [
    { key: 'showground_manager_name',  label: 'Showground Manager Name',    type: 'text', placeholder: 'Event / ground manager name' },
    { key: 'showground_manager_phone', label: 'Showground Manager Phone',   type: 'tel',  placeholder: '+44 7700 900000' },
    { key: 'livestock_on_site',        label: 'Livestock / Agricultural Machinery on Site?', type: 'boolean' },
    { key: 'public_entry_count',       label: 'Expected Public Attendance',  type: 'number', placeholder: '2000' },
  ],

  corporate: [
    { key: 'event_manager_name',     label: 'Event Manager Name',          type: 'text', placeholder: 'On-site event manager' },
    { key: 'event_manager_phone',    label: 'Event Manager Phone',         type: 'tel',  placeholder: '+44 7700 900000' },
    { key: 'vip_attendees',          label: 'VIP / Executive Attendees?',  type: 'boolean', hint: 'Flag if discreet medical presence is required.' },
    { key: 'alcohol_served',         label: 'Alcohol Served at Event?',    type: 'boolean' },
    { key: 'venue_security_contact', label: 'Venue Security Contact',      type: 'tel',  placeholder: '+44 7700 900000' },
  ],

  private_events: [
    { key: 'event_organiser_name',   label: 'Event Organiser Name',        type: 'text', placeholder: 'Host or organiser name' },
    { key: 'event_organiser_phone',  label: 'Event Organiser Phone',       type: 'tel',  placeholder: '+44 7700 900000' },
    { key: 'under_18s_present',      label: 'Under-18s Attending?',        type: 'boolean' },
    { key: 'alcohol_licensed',       label: 'Licensed Alcohol Event?',     type: 'boolean', hint: 'Flag if Temporary Events Notice (TEN) or premises licence applies.' },
    { key: 'venue_security_contact', label: 'Venue / Venue Manager Contact', type: 'tel', placeholder: '+44 7700 900000' },
  ],

  education: [
    { key: 'safeguarding_lead_name',  label: 'Designated Safeguarding Lead (DSL) Name', type: 'text', placeholder: 'DSL name' },
    { key: 'safeguarding_lead_phone', label: 'DSL Phone',                  type: 'tel',  placeholder: '+44 7700 900000' },
    { key: 'school_nurse_name',       label: 'School Nurse / First Aider Name', type: 'text', placeholder: 'Leave blank if none on site' },
    { key: 'sen_coordinator',         label: 'SENCO / SEN Coordinator',    type: 'text', placeholder: 'Name — relevant for students with complex needs' },
    { key: 'parent_contact_protocol', label: 'Parent / Guardian Contact Protocol', type: 'textarea', placeholder: 'How will parents be contacted in an emergency? Which staff member holds parent contact lists?' },
    { key: 'dbs_confirmed',           label: 'DBS Enhanced Check Confirmed?', type: 'boolean', hint: 'Confirm medic DBS has been verified by the institution.' },
  ],

  outdoor_adventure: [
    { key: 'course_start_grid_ref',  label: 'Course Start Grid Reference', type: 'text', placeholder: 'OS grid ref e.g. SH 611 546 or what3words' },
    { key: 'extraction_plan_ref',    label: 'Emergency Extraction Plan Reference', type: 'text', placeholder: 'Plan doc ref or brief description' },
    { key: 'mountain_rescue_contact', label: 'Mountain Rescue / Coastguard Number', type: 'tel', placeholder: '999 or direct team number if known' },
    { key: 'weather_check_complete', label: 'Weather Forecast Checked?',   type: 'boolean', hint: 'Check Met Office and mountain weather where applicable.' },
    { key: 'course_sweep_plan',      label: 'Course Sweep Plan in Place?', type: 'boolean', hint: 'Confirm a sweep marshal / tail runner plan exists.' },
    { key: 'radio_communications',   label: 'Radio / Comms Channel',       type: 'text', placeholder: 'e.g. Channel 3 — Medical, repeater freq, satellite phone plan' },
  ],

  general: [
    { key: 'event_organiser_name',  label: 'Event / Site Organiser Name',  type: 'text', placeholder: 'Main contact on the day' },
    { key: 'event_organiser_phone', label: 'Organiser Phone',              type: 'tel',  placeholder: '+44 7700 900000' },
    { key: 'security_contact',      label: 'Security / Venue Contact',     type: 'tel',  placeholder: '+44 7700 900000' },
  ],
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BriefData['status'] }) {
  if (status === 'complete') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Brief complete
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded-full">
        <Clock className="w-3.5 h-3.5" />
        In progress
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-500/10 border border-gray-600/30 px-2.5 py-1 rounded-full">
      <AlertTriangle className="w-3.5 h-3.5" />
      Not started
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BookingBriefFormProps {
  bookingId: string;
  /** Pre-resolved vertical (from booking.event_vertical or org primary vertical) */
  vertical: string;
}

export default function BookingBriefForm({ bookingId, vertical }: BookingBriefFormProps) {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extraOpen, setExtraOpen] = useState(true);

  const extraFields = EXTRA_FIELDS[vertical] ?? EXTRA_FIELDS.general;

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchBrief() {
      try {
        const res = await fetch(`/api/admin/bookings/${bookingId}/brief`);
        if (!res.ok) throw new Error('Failed to load brief');
        const data = await res.json();
        setBrief(data.brief);
      } catch {
        toast.error('Could not load pre-event brief');
      } finally {
        setLoading(false);
      }
    }
    fetchBrief();
  }, [bookingId]);

  // ── Field helpers ──────────────────────────────────────────────────────────

  function setCommon(key: keyof BriefData, value: unknown) {
    setBrief((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function setExtra(key: string, value: unknown) {
    setBrief((prev) =>
      prev ? { ...prev, extra_fields: { ...prev.extra_fields, [key]: value } } : prev
    );
  }

  // ── Auto-detect status ─────────────────────────────────────────────────────

  const inferStatus = useCallback((b: BriefData): BriefData['status'] => {
    const commonFilled = !!(
      b.nearest_ae_name &&
      b.nearest_ae_address &&
      b.ae_travel_minutes &&
      b.on_site_contact_name &&
      b.on_site_contact_phone
    );
    if (!commonFilled) {
      const anyFilled = b.nearest_ae_name || b.ae_travel_minutes || b.on_site_contact_name;
      return anyFilled ? 'in_progress' : 'not_started';
    }
    return 'in_progress'; // 'complete' only set explicitly
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave(markComplete = false) {
    if (!brief) return;
    setSaving(true);
    try {
      const status = markComplete ? 'complete' : inferStatus(brief);
      const res = await fetch(`/api/admin/bookings/${bookingId}/brief`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nearest_ae_name: brief.nearest_ae_name,
          nearest_ae_address: brief.nearest_ae_address,
          ae_travel_minutes: brief.ae_travel_minutes,
          helicopter_lz: brief.helicopter_lz,
          emergency_rendezvous: brief.emergency_rendezvous,
          on_site_contact_name: brief.on_site_contact_name,
          on_site_contact_phone: brief.on_site_contact_phone,
          known_hazards: brief.known_hazards,
          extra_fields: brief.extra_fields,
          status,
          event_vertical: vertical,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(err.error ?? 'Failed to save brief');
        return;
      }
      const { brief: updated } = await res.json();
      setBrief(updated);
      toast.success(markComplete ? 'Brief marked as complete' : 'Brief saved');
    } catch {
      toast.error('Failed to save brief');
    } finally {
      setSaving(false);
    }
  }

  // ── Shared input class ─────────────────────────────────────────────────────

  const inputCls =
    'w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-3 text-gray-400 text-sm">Loading medical brief…</span>
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="space-y-6">
      {/* Status + header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Complete this before the shift starts. The medic will use it for emergency planning.
        </p>
        <StatusBadge status={brief.status} />
      </div>

      {/* ── Common fields ──────────────────────────────────────────────────── */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <Hospital className="w-4 h-4 text-red-400" />
          Emergency Response
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nearest A&E */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nearest A&amp;E — Hospital Name
            </label>
            <input
              type="text"
              value={brief.nearest_ae_name ?? ''}
              onChange={(e) => setCommon('nearest_ae_name', e.target.value || null)}
              placeholder="e.g. Royal London Hospital"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              A&amp;E Address
            </label>
            <input
              type="text"
              value={brief.nearest_ae_address ?? ''}
              onChange={(e) => setCommon('nearest_ae_address', e.target.value || null)}
              placeholder="Full address"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Journey Time to A&amp;E (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={brief.ae_travel_minutes ?? ''}
              onChange={(e) => setCommon('ae_travel_minutes', parseInt(e.target.value) || null)}
              placeholder="e.g. 12"
              className={inputCls}
            />
          </div>

          {/* Helicopter LZ */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <Helicopter className="w-3.5 h-3.5 text-blue-400" />
              Helicopter Landing Zone (LZ)
            </label>
            <input
              type="text"
              value={brief.helicopter_lz ?? ''}
              onChange={(e) => setCommon('helicopter_lz', e.target.value || null)}
              placeholder="what3words, grid ref, or description"
              className={inputCls}
            />
          </div>

          {/* Emergency rendezvous */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-yellow-400" />
              Emergency Services Rendezvous Point
            </label>
            <input
              type="text"
              value={brief.emergency_rendezvous ?? ''}
              onChange={(e) => setCommon('emergency_rendezvous', e.target.value || null)}
              placeholder="Where ambulances / police should stage on arrival"
              className={inputCls}
            />
          </div>
        </div>

        {/* On-site emergency contact */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-green-400" />
            On-Site Emergency Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Contact Name</label>
              <input
                type="text"
                value={brief.on_site_contact_name ?? ''}
                onChange={(e) => setCommon('on_site_contact_name', e.target.value || null)}
                placeholder="Name of senior person on site"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Contact Phone</label>
              <input
                type="tel"
                value={brief.on_site_contact_phone ?? ''}
                onChange={(e) => setCommon('on_site_contact_phone', e.target.value || null)}
                placeholder="+44 7700 900000"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Known hazards */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
            Known Hazards on Site
          </label>
          <textarea
            value={brief.known_hazards ?? ''}
            onChange={(e) => setCommon('known_hazards', e.target.value || null)}
            rows={3}
            placeholder="List any known hazards the medic should be aware of before arriving…"
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {/* ── Vertical-specific fields ───────────────────────────────────────── */}
      {extraFields.length > 0 && (
        <div className="border-t border-gray-700/50 pt-6">
          <button
            type="button"
            onClick={() => setExtraOpen((o) => !o)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Vertical-Specific Details
            </h3>
            {extraOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {extraOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {extraFields.map((field) => {
                const value = brief.extra_fields[field.key];

                if (field.type === 'boolean') {
                  return (
                    <div key={field.key} className="flex items-start justify-between py-3 border-b border-gray-700/40 last:border-0 col-span-full">
                      <div>
                        <p className="text-sm font-medium text-white">{field.label}</p>
                        {field.hint && <p className="text-xs text-gray-400 mt-0.5">{field.hint}</p>}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={!!value}
                          onChange={(e) => setExtra(field.key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  );
                }

                if (field.type === 'textarea') {
                  return (
                    <div key={field.key} className="col-span-full">
                      <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                      {field.hint && <p className="text-xs text-gray-500 mb-1.5">{field.hint}</p>}
                      <textarea
                        value={(value as string) ?? ''}
                        onChange={(e) => setExtra(field.key, e.target.value || null)}
                        rows={3}
                        placeholder={field.placeholder}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  );
                }

                return (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                    {field.hint && <p className="text-xs text-gray-500 mb-1.5">{field.hint}</p>}
                    <input
                      type={field.type}
                      value={(value as string | number) ?? ''}
                      onChange={(e) =>
                        setExtra(
                          field.key,
                          field.type === 'number'
                            ? parseInt(e.target.value) || null
                            : e.target.value || null
                        )
                      }
                      placeholder={field.placeholder}
                      className={inputCls}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-500">
          {brief.completed_at
            ? `Completed ${new Date(brief.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'Not yet completed'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || brief.status === 'complete'}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {brief.status === 'complete' ? 'Already complete' : 'Mark Brief Complete'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
