/**
 * Admin Shift Templates Page
 *
 * Create reusable shift templates to speed up booking creation.
 * Templates define standard shift patterns (e.g. "Day Shift 07:00-19:00 - Confined Space").
 *
 * DB table: shift_templates (id, org_id, name, shift_start_time, shift_end_time,
 *           qualification_level, confined_space_required, trauma_specialist_required, notes)
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { ClipboardList, Plus, Trash2, Edit2, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ShiftTemplate {
  id: string;
  name: string;
  shift_start_time: string;
  shift_end_time: string;
  qualification_level: string;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
  notes: string | null;
}

const QUALIFICATION_LEVELS = ['FPOS', 'FPOS-I', 'EMT', 'Paramedic'];

const emptyForm = {
  name: '',
  shift_start_time: '07:00',
  shift_end_time: '19:00',
  qualification_level: 'FPOS',
  confined_space_required: false,
  trauma_specialist_required: false,
  notes: '',
};

export default function ShiftTemplatesPage() {
  const { org } = useOrg();
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function fetchTemplates() {
    if (!org?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('org_id', org.id)
      .order('name');

    if (error) {
      console.error('Error fetching shift templates:', error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTemplates();
  }, [org?.id]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(t: ShiftTemplate) {
    setForm({
      name: t.name,
      shift_start_time: t.shift_start_time,
      shift_end_time: t.shift_end_time,
      qualification_level: t.qualification_level,
      confined_space_required: t.confined_space_required,
      trauma_specialist_required: t.trauma_specialist_required,
      notes: t.notes ?? '',
    });
    setEditingId(t.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!org?.id || !form.name) {
      toast.error('Template name is required');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name,
      shift_start_time: form.shift_start_time,
      shift_end_time: form.shift_end_time,
      qualification_level: form.qualification_level,
      confined_space_required: form.confined_space_required,
      trauma_specialist_required: form.trauma_specialist_required,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('shift_templates')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update template');
      } else {
        toast.success('Template updated');
        await fetchTemplates();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('shift_templates').insert({
        ...payload,
        org_id: org.id,
      });

      if (error) {
        toast.error('Failed to create template');
      } else {
        toast.success('Template created');
        await fetchTemplates();
        resetForm();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('shift_templates').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete template');
    } else {
      toast.success('Template deleted');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Templates</h1>
          <p className="text-gray-400 mt-1">Create reusable shift patterns to speed up booking</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-sm font-medium shadow-lg shadow-blue-900/30"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">{editingId ? 'Edit Template' : 'New Template'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm font-medium block mb-1">Template Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Day Shift — Confined Space"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm font-medium block mb-1">Start Time</label>
              <input
                type="time"
                value={form.shift_start_time}
                onChange={(e) => setForm((p) => ({ ...p, shift_start_time: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm font-medium block mb-1">End Time</label>
              <input
                type="time"
                value={form.shift_end_time}
                onChange={(e) => setForm((p) => ({ ...p, shift_end_time: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm font-medium block mb-1">Qualification Level</label>
              <select
                value={form.qualification_level}
                onChange={(e) => setForm((p) => ({ ...p, qualification_level: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {QUALIFICATION_LEVELS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.confined_space_required}
                  onChange={(e) => setForm((p) => ({ ...p, confined_space_required: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-gray-300 text-sm">Confined Space Required</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.trauma_specialist_required}
                  onChange={(e) => setForm((p) => ({ ...p, trauma_specialist_required: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-gray-300 text-sm">Trauma Specialist Required</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm font-medium block mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
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

      {/* Templates Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <ClipboardList className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No shift templates yet</p>
          <p className="text-gray-500 text-sm mt-1">Create templates to quickly fill bookings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <p className="text-white font-semibold">{t.name}</p>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(t)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <Clock className="w-4 h-4 text-blue-400" />
                {t.shift_start_time}–{t.shift_end_time}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full text-xs">{t.qualification_level}</span>
                {t.confined_space_required && (
                  <span className="px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded-full text-xs">Confined Space</span>
                )}
                {t.trauma_specialist_required && (
                  <span className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded-full text-xs">Trauma Specialist</span>
                )}
              </div>
              {t.notes && <p className="text-gray-400 text-xs italic">{t.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
