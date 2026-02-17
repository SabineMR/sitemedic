/**
 * Admin Geofences Page
 *
 * Configure geofence boundaries for sites. When a medic checks in or out,
 * the geofence-check edge function validates they are within the configured radius.
 *
 * DB table: geofences (id, org_id, site_name, lat, lng, radius_metres)
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { MapPin, Plus, Trash2, Save, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface Geofence {
  id: string;
  site_name: string;
  lat: number;
  lng: number;
  radius_metres: number;
  created_at: string;
}

const DEFAULT_RADIUS = 200;

export default function GeofencesPage() {
  const { org } = useOrg();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    site_name: '',
    lat: '',
    lng: '',
    radius_metres: String(DEFAULT_RADIUS),
  });

  async function fetchGeofences() {
    if (!org?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('geofences')
      .select('*')
      .eq('org_id', org.id)
      .order('site_name');

    if (error) {
      console.error('Error fetching geofences:', error);
    } else {
      setGeofences(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchGeofences();
  }, [org?.id]);

  function resetForm() {
    setForm({ site_name: '', lat: '', lng: '', radius_metres: String(DEFAULT_RADIUS) });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(g: Geofence) {
    setForm({
      site_name: g.site_name,
      lat: String(g.lat),
      lng: String(g.lng),
      radius_metres: String(g.radius_metres),
    });
    setEditingId(g.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!org?.id) return;
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const radius = parseInt(form.radius_metres, 10);

    if (!form.site_name || isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      toast.error('Please fill in all fields with valid values');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (editingId) {
      const { error } = await supabase
        .from('geofences')
        .update({ site_name: form.site_name, lat, lng, radius_metres: radius })
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
        org_id: org.id,
        site_name: form.site_name,
        lat,
        lng,
        radius_metres: radius,
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
            <div>
              <label className="text-gray-400 text-sm font-medium block mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.lat}
                onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
                placeholder="e.g. 53.4808"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm font-medium block mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.lng}
                onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
                placeholder="e.g. -2.2426"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm font-medium block mb-1">Radius (metres)</label>
              <input
                type="number"
                min={50}
                max={5000}
                value={form.radius_metres}
                onChange={(e) => setForm((p) => ({ ...p, radius_metres: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
                  <p className="text-white font-medium">{g.site_name}</p>
                  <p className="text-gray-400 text-xs">
                    {g.lat.toFixed(6)}, {g.lng.toFixed(6)} · {g.radius_metres}m radius
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
