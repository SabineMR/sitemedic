/**
 * Admin Beacons Page
 *
 * Configure Bluetooth beacon UUIDs for each job site.
 * Beacons are the GPS fallback — when medics are in areas with no satellite
 * signal (underground, confined spaces, steel buildings), the mobile app
 * scans for these beacons to detect arrival and departure automatically.
 *
 * Supports: iBeacon (Apple) and Eddystone-UID (Google)
 * Any standard off-the-shelf BLE beacon works.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { Bluetooth, Plus, Trash2, Save, Edit2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface SiteBeacon {
  id: string;
  site_name: string;
  uuid: string;
  major: number | null;
  minor: number | null;
  beacon_type: 'ibeacon' | 'eddystone';
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const BEACON_TYPE_LABELS: Record<string, string> = {
  ibeacon: 'iBeacon',
  eddystone: 'Eddystone-UID',
};

// Validates UUID format: 8-4-4-4-12 hex groups
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Validates Eddystone format: eddystone:<20 hex chars>:<12 hex chars>
const EDDYSTONE_REGEX = /^eddystone:[0-9a-f]{20}:[0-9a-f]{12}$/i;

function validateUuid(uuid: string, type: string): string | null {
  if (type === 'ibeacon' && !UUID_REGEX.test(uuid)) {
    return 'iBeacon UUID must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
  }
  if (type === 'eddystone' && !EDDYSTONE_REGEX.test(uuid)) {
    return 'Eddystone format: eddystone:<20-char namespace>:<12-char instance>';
  }
  return null;
}

const emptyForm = {
  site_name: '',
  uuid: '',
  major: '',
  minor: '',
  beacon_type: 'ibeacon' as 'ibeacon' | 'eddystone',
  notes: '',
};

export default function BeaconsPage() {
  const { org } = useOrg();
  const [beacons, setBeacons] = useState<SiteBeacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uuidError, setUuidError] = useState<string | null>(null);

  async function fetchBeacons() {
    if (!org?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('site_beacons')
      .select('*')
      .eq('org_id', org.id)
      .order('site_name');

    if (error) {
      toast.error('Failed to load beacons');
    } else {
      setBeacons(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBeacons();
  }, [org?.id]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setUuidError(null);
  }

  function startEdit(b: SiteBeacon) {
    setForm({
      site_name: b.site_name,
      uuid: b.uuid,
      major: b.major !== null ? String(b.major) : '',
      minor: b.minor !== null ? String(b.minor) : '',
      beacon_type: b.beacon_type,
      notes: b.notes ?? '',
    });
    setEditingId(b.id);
    setShowForm(true);
    setUuidError(null);
  }

  function handleUuidChange(value: string) {
    setForm((p) => ({ ...p, uuid: value }));
    setUuidError(validateUuid(value, form.beacon_type));
  }

  function handleTypeChange(value: 'ibeacon' | 'eddystone') {
    setForm((p) => ({ ...p, beacon_type: value, uuid: '' }));
    setUuidError(null);
  }

  async function handleSave() {
    if (!org?.id) return;

    const uuidVal = form.uuid.trim().toLowerCase();
    const err = validateUuid(uuidVal, form.beacon_type);
    if (err) {
      setUuidError(err);
      return;
    }

    if (!form.site_name.trim()) {
      toast.error('Site name is required');
      return;
    }

    const major = form.major !== '' ? parseInt(form.major, 10) : null;
    const minor = form.minor !== '' ? parseInt(form.minor, 10) : null;

    if (form.major !== '' && (isNaN(major!) || major! < 0 || major! > 65535)) {
      toast.error('Major must be a number between 0 and 65535');
      return;
    }
    if (form.minor !== '' && (isNaN(minor!) || minor! < 0 || minor! > 65535)) {
      toast.error('Minor must be a number between 0 and 65535');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      site_name: form.site_name.trim(),
      uuid: uuidVal,
      major,
      minor,
      beacon_type: form.beacon_type,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('site_beacons')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update beacon');
      } else {
        toast.success('Beacon updated');
        await fetchBeacons();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('site_beacons').insert({
        ...payload,
        org_id: org.id,
        is_active: true,
      });

      if (error) {
        toast.error('Failed to create beacon');
      } else {
        toast.success('Beacon created — the mobile app will sync it next time medics open the app');
        await fetchBeacons();
        resetForm();
      }
    }
    setSaving(false);
  }

  async function handleToggleActive(beacon: SiteBeacon) {
    const supabase = createClient();
    const { error } = await supabase
      .from('site_beacons')
      .update({ is_active: !beacon.is_active })
      .eq('id', beacon.id);

    if (error) {
      toast.error('Failed to update beacon status');
    } else {
      toast.success(beacon.is_active ? 'Beacon deactivated' : 'Beacon activated');
      setBeacons((prev) =>
        prev.map((b) => (b.id === beacon.id ? { ...b, is_active: !b.is_active } : b))
      );
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('site_beacons').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete beacon');
    } else {
      toast.success('Beacon deleted');
      setBeacons((prev) => prev.filter((b) => b.id !== id));
    }
  }

  const activeCount = beacons.filter((b) => b.is_active).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bluetooth Beacons</h1>
          <p className="text-gray-400 mt-1">
            GPS fallback check-in for underground and no-signal sites
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-sm font-medium shadow-lg shadow-blue-900/30"
        >
          <Plus className="w-4 h-4" />
          Add Beacon
        </button>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 p-4 bg-blue-900/20 border border-blue-700/40 rounded-xl">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200 space-y-1">
          <p className="font-medium">How beacon check-in works</p>
          <p className="text-blue-300">
            Place a BLE beacon (iBeacon or Eddystone) at each site that has poor or no cellular/GPS signal.
            The SiteMedic app scans for these beacons every 5 seconds. After 3 consecutive detections
            within ~10 metres, an <span className="font-mono bg-blue-900/50 px-1 rounded">arrived_on_site</span> event
            is recorded locally and synced when the medic's phone regains signal.
            The admin timeline shows <span className="font-mono bg-blue-900/50 px-1 rounded">Bluetooth Beacon</span> as
            the source so you can distinguish it from GPS check-ins.
          </p>
        </div>
      </div>

      {/* Stats row */}
      {beacons.length > 0 && (
        <div className="flex gap-4">
          <div className="px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl">
            <p className="text-2xl font-bold text-white">{beacons.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total beacons</p>
          </div>
          <div className="px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl">
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Active</p>
          </div>
          <div className="px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl">
            <p className="text-2xl font-bold text-gray-400">{beacons.length - activeCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Inactive</p>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-5">
          <h2 className="text-white font-semibold text-lg">
            {editingId ? 'Edit Beacon' : 'New Beacon'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site name */}
            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm font-medium block mb-1">
                Site Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.site_name}
                onChange={(e) => setForm((p) => ({ ...p, site_name: e.target.value }))}
                placeholder="e.g. Manchester Plant Room B2"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Beacon type */}
            <div>
              <label className="text-gray-400 text-sm font-medium block mb-1">Beacon Type</label>
              <select
                value={form.beacon_type}
                onChange={(e) => handleTypeChange(e.target.value as 'ibeacon' | 'eddystone')}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="ibeacon">iBeacon (Apple — most common)</option>
                <option value="eddystone">Eddystone-UID (Google)</option>
              </select>
            </div>

            {/* UUID */}
            <div>
              <label className="text-gray-400 text-sm font-medium block mb-1">
                {form.beacon_type === 'ibeacon' ? 'Proximity UUID' : 'Eddystone ID'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.uuid}
                onChange={(e) => handleUuidChange(e.target.value)}
                placeholder={
                  form.beacon_type === 'ibeacon'
                    ? 'f7826da6-4fa2-4e98-8024-bc5b71e0893e'
                    : 'eddystone:aabbccddeeff00112233:aabbccddee00'
                }
                className={`w-full px-3 py-2 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 text-sm font-mono ${
                  uuidError
                    ? 'border-red-500/70 focus:ring-red-500'
                    : 'border-gray-700/50 focus:ring-blue-500'
                }`}
              />
              {uuidError && <p className="text-red-400 text-xs mt-1">{uuidError}</p>}
              {form.beacon_type === 'ibeacon' && !uuidError && (
                <p className="text-gray-500 text-xs mt-1">
                  Found in your beacon's app or on its label (e.g. Kontakt.io, Estimote, Minew)
                </p>
              )}
            </div>

            {/* Major (iBeacon only) */}
            {form.beacon_type === 'ibeacon' && (
              <div>
                <label className="text-gray-400 text-sm font-medium block mb-1">
                  Major <span className="text-gray-500">(optional, 0–65535)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={65535}
                  value={form.major}
                  onChange={(e) => setForm((p) => ({ ...p, major: e.target.value }))}
                  placeholder="Leave blank to match any"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            )}

            {/* Minor (iBeacon only) */}
            {form.beacon_type === 'ibeacon' && (
              <div>
                <label className="text-gray-400 text-sm font-medium block mb-1">
                  Minor <span className="text-gray-500">(optional, 0–65535)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={65535}
                  value={form.minor}
                  onChange={(e) => setForm((p) => ({ ...p, minor: e.target.value }))}
                  placeholder="Leave blank to match any"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            )}

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm font-medium block mb-1">
                Notes <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Mounted on wall near entrance gate, 1.5m height"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !!uuidError}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-sm font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : editingId ? 'Update Beacon' : 'Create Beacon'}
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Beacon list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : beacons.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <Bluetooth className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No beacons configured</p>
          <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
            Add a beacon for sites with poor GPS signal so medics can still check in automatically
          </p>
        </div>
      ) : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl divide-y divide-gray-700/30">
          {beacons.map((beacon) => (
            <div key={beacon.id} className="flex items-start justify-between px-6 py-4 gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    beacon.is_active
                      ? 'bg-blue-900/50 border-blue-700/50'
                      : 'bg-gray-700/50 border-gray-600/50'
                  }`}
                >
                  <Bluetooth
                    className={`w-5 h-5 ${beacon.is_active ? 'text-blue-400' : 'text-gray-500'}`}
                  />
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium">{beacon.site_name}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        beacon.is_active
                          ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                      }`}
                    >
                      {beacon.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded-full text-xs text-gray-400">
                      {BEACON_TYPE_LABELS[beacon.beacon_type]}
                    </span>
                  </div>

                  <p className="text-gray-400 text-xs font-mono mt-1 truncate">{beacon.uuid}</p>

                  {(beacon.major !== null || beacon.minor !== null) && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {beacon.major !== null && `Major: ${beacon.major}`}
                      {beacon.major !== null && beacon.minor !== null && ' · '}
                      {beacon.minor !== null && `Minor: ${beacon.minor}`}
                    </p>
                  )}

                  {beacon.notes && (
                    <p className="text-gray-500 text-xs mt-1 italic">{beacon.notes}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(beacon)}
                  title={beacon.is_active ? 'Deactivate' : 'Activate'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    beacon.is_active
                      ? 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/20'
                      : 'text-gray-400 hover:text-green-400 hover:bg-green-900/20'
                  }`}
                >
                  {beacon.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => startEdit(beacon)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(beacon.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Setup guide */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Setting up a beacon for a site</h2>
        <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
          <li>
            <span className="font-medium text-white">Buy a beacon</span> — any iBeacon-compatible
            device works (Kontakt.io, Estimote, Minew, Feasy, or similar). Cost ~£10–30 each.
          </li>
          <li>
            <span className="font-medium text-white">Find the UUID</span> — open the beacon's
            companion app or check the label on the beacon itself.
          </li>
          <li>
            <span className="font-medium text-white">Add it here</span> — enter the site name and
            UUID above. Major/Minor are optional; leave blank if you only have one beacon per site.
          </li>
          <li>
            <span className="font-medium text-white">Place the beacon</span> — mount near the site
            entrance at 1–2m height. The app detects within ~10 metres.
          </li>
          <li>
            <span className="font-medium text-white">Medics open the app</span> — beacon configs
            sync automatically next time the app opens on the medic's phone.
          </li>
        </ol>
      </div>
    </div>
  );
}
