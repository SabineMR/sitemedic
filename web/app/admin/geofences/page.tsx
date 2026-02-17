/**
 * Admin Geofences Page
 *
 * Configure geofence boundaries for sites. When a medic checks in or out,
 * the geofence-check edge function validates they are within the configured radius.
 *
 * DB table: geofences (id, org_id, site_name, center_latitude, center_longitude, radius_meters, booking_id, notes)
 * Migration 119 added site_name column and made booking_id nullable for org-level geofences.
 */

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { MapPin, Plus, Trash2, Save, Edit2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useGeofenceCoverage } from '@/lib/queries/admin/geofences';

const GeofenceMapPicker = dynamic(
  () => import('@/components/admin/GeofenceMapPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-gray-900 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading map...</span>
      </div>
    ),
  }
);

interface Geofence {
  id: string;
  site_name: string | null;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  created_at: string;
}

function GeofenceCoverageCard() {
  const { data, isLoading } = useGeofenceCoverage();

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-2xl" />;
  }

  let label: string;
  if (!data || data.total === 0) {
    label = 'No active bookings to cover';
  } else if (data.covered === 0) {
    label = `0 of ${data.total} active sites covered (0%)`;
  } else {
    label = `${data.covered} of ${data.total} active sites covered (${data.percentage}%)`;
  }

  const isFullCoverage = data && data.total > 0 && data.covered === data.total;
  const isPartialCoverage = data && data.total > 0 && data.covered > 0 && data.covered < data.total;

  return (
    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border ${
      isFullCoverage
        ? 'bg-green-900/20 border-green-700/50'
        : isPartialCoverage
          ? 'bg-blue-900/20 border-blue-700/50'
          : 'bg-gray-800/50 border-gray-700/50'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isFullCoverage
          ? 'bg-green-900/50'
          : isPartialCoverage
            ? 'bg-blue-900/50'
            : 'bg-gray-900/50'
      }`}>
        <Shield className={`w-5 h-5 ${
          isFullCoverage
            ? 'text-green-400'
            : isPartialCoverage
              ? 'text-blue-400'
              : 'text-gray-400'
        }`} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Geofence Coverage
        </p>
        <p className="text-white font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function GeofencesPage() {
  const { orgId } = useOrg();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [defaultRadius, setDefaultRadius] = useState(200);
  const [form, setForm] = useState<{
    site_name: string;
    center_latitude: number | null;
    center_longitude: number | null;
    radius_meters: string;
  }>({
    site_name: '',
    center_latitude: null,
    center_longitude: null,
    radius_meters: String(200),
  });

  // Fetch geofence_default_radius from org_settings
  useEffect(() => {
    async function loadDefaultRadius() {
      const supabase = createClient();
      const { data } = await supabase
        .from('org_settings')
        .select('geofence_default_radius')
        .single();
      if (data?.geofence_default_radius) {
        setDefaultRadius(Number(data.geofence_default_radius));
        setForm((prev) => ({ ...prev, radius_meters: String(data.geofence_default_radius) }));
      }
    }
    loadDefaultRadius();
  }, []);

  async function fetchGeofences() {
    if (!orgId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('geofences')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching geofences:', error);
    } else {
      setGeofences(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchGeofences();
  }, [orgId]);

  function resetForm() {
    setForm({
      site_name: '',
      center_latitude: null,
      center_longitude: null,
      radius_meters: String(defaultRadius),
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(g: Geofence) {
    setForm({
      site_name: g.site_name ?? '',
      center_latitude: g.center_latitude,
      center_longitude: g.center_longitude,
      radius_meters: String(g.radius_meters),
    });
    setEditingId(g.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!orgId) return;

    if (form.center_latitude === null || form.center_longitude === null) {
      toast.error('Please click the map to place the geofence centre');
      return;
    }

    const radius = parseInt(form.radius_meters, 10);

    if (!form.site_name || isNaN(radius)) {
      toast.error('Please fill in all fields with valid values');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (editingId) {
      const { error } = await supabase
        .from('geofences')
        .update({
          site_name: form.site_name,
          center_latitude: form.center_latitude,
          center_longitude: form.center_longitude,
          radius_meters: radius,
        })
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update geofence');
      } else {
        toast.success('Geofence updated');
        await fetchGeofences();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('geofences').insert({
        org_id: orgId,
        site_name: form.site_name,
        center_latitude: form.center_latitude,
        center_longitude: form.center_longitude,
        radius_meters: radius,
      });

      if (error) {
        toast.error('Failed to create geofence');
      } else {
        toast.success('Geofence created');
        await fetchGeofences();
        resetForm();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('geofences').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete geofence');
    } else {
      toast.success('Geofence deleted');
      setGeofences((prev) => prev.filter((g) => g.id !== id));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Geofences</h1>
          <p className="text-gray-400 mt-1">Configure site boundaries for medic check-in validation</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-sm font-medium shadow-lg shadow-blue-900/30"
        >
          <Plus className="w-4 h-4" />
          Add Geofence
        </button>
      </div>

      <GeofenceCoverageCard />

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">{editingId ? 'Edit Geofence' : 'New Geofence'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm font-medium block mb-1">Site Name</label>
              <input
                type="text"
                value={form.site_name}
                onChange={(e) => setForm((p) => ({ ...p, site_name: e.target.value }))}
                placeholder="e.g. Manchester City Centre Site A"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm font-medium block mb-1">Location &amp; Radius</label>
              <GeofenceMapPicker
                lat={form.center_latitude}
                lng={form.center_longitude}
                radiusMeters={parseInt(form.radius_meters, 10) || 200}
                onChange={(lat, lng, radius) =>
                  setForm((p) => ({
                    ...p,
                    center_latitude: lat,
                    center_longitude: lng,
                    radius_meters: String(radius),
                  }))
                }
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-sm font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
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

      {/* Geofence List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : geofences.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No geofences configured</p>
          <p className="text-gray-500 text-sm mt-1">Add a geofence to validate medic check-in locations</p>
        </div>
      ) : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl divide-y divide-gray-700/30">
          {geofences.map((g) => (
            <div key={g.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900/50 border border-blue-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{g.site_name ?? '(Unnamed)'}</p>
                  <p className="text-gray-400 text-xs">
                    {g.center_latitude.toFixed(6)}, {g.center_longitude.toFixed(6)} &middot; {g.radius_meters}m radius
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(g)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
