/**
 * Territory Detail Side Panel
 *
 * Displays comprehensive territory information when clicked from map or list:
 * - Assigned medics with auto-assignment score breakdown
 * - Utilization metrics and trends
 * - Recent bookings for the territory
 * - Territory notes with inline editing
 */

'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Edit2, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRequireOrg } from '@/contexts/org-context';
import { useMedics } from '@/lib/queries/admin/medics';
import { useAssignMedicToTerritory } from '@/lib/queries/admin/territories';
import { calculateAutoMatchScore, formatScoreBreakdown } from '@/lib/territory/auto-assignment';
import type { TerritoryWithMetrics } from '@/lib/queries/admin/territories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TerritoryDetailProps {
  territory: TerritoryWithMetrics | null;
  onClose: () => void;
}

interface Booking {
  id: string;
  shift_date: string;
  status: string;
  shift_hours: number;
}

export default function TerritoryDetail({ territory, onClose }: TerritoryDetailProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [changingMedic, setChangingMedic] = useState<'primary' | 'secondary' | null>(null);

  const supabase = createClient();
  const orgId = useRequireOrg();
  const queryClient = useQueryClient();
  const { data: medics = [] } = useMedics();
  const assignMedic = useAssignMedicToTerritory();

  // Fetch recent bookings for this territory
  const { data: recentBookings = [] } = useQuery({
    queryKey: ['admin', 'territories', 'bookings', territory?.postcode_sector, orgId],
    queryFn: async () => {
      if (!territory) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('id, shift_date, status, shift_hours')
        .eq('site_postcode', territory.postcode_sector)
        .order('shift_date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }

      return data as Booking[];
    },
    enabled: !!territory,
  });

  // Mutation to update notes
  const updateNotes = useMutation({
    mutationFn: async (newNotes: string) => {
      if (!territory) return;

      const { error } = await supabase
        .from('territories')
        .update({ notes: newNotes })
        .eq('id', territory.id)
        .eq('org_id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'territories', 'with-metrics', orgId] });
      setEditingNotes(false);
    },
  });

  // Animate panel entrance
  useEffect(() => {
    if (territory) {
      setIsAnimated(true);
      setNotes(territory.notes || '');
    } else {
      setIsAnimated(false);
    }
  }, [territory]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!territory) return null;

  const handleAssignMedic = (medicId: string, role: 'primary' | 'secondary') => {
    assignMedic.mutate({
      territory_id: territory.id,
      medic_id: medicId,
      role,
    });
    setChangingMedic(null);
  };

  const handleSaveNotes = () => {
    updateNotes.mutate(notes);
  };

  // Calculate auto-assignment scores for medic selector
  const getMedicScores = () => {
    return medics
      .filter(m => m.available_for_work)
      .map(medic => {
        const score = calculateAutoMatchScore(medic, {
          postcode: territory.postcode_sector,
          confined_space_required: false,
          trauma_specialist_required: false,
          shift_date: new Date().toISOString().split('T')[0],
          shift_start_time: '09:00',
          shift_end_time: '17:00',
        });
        return { medic, score };
      })
      .sort((a, b) => b.score.total_score - a.score.total_score);
  };

  const medicScores = getMedicScores();

  // Get scores for currently assigned medics
  const primaryMedicScore = territory.primary_medic_id
    ? medicScores.find(ms => ms.medic.id === territory.primary_medic_id)?.score
    : null;

  const secondaryMedicScore = territory.secondary_medic_id
    ? medicScores.find(ms => ms.medic.id === territory.secondary_medic_id)?.score
    : null;

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get utilization color
  const getUtilizationColor = (pct: number) => {
    if (pct < 50) return 'bg-green-500';
    if (pct <= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700/50 z-50
          overflow-y-auto shadow-2xl
          transition-transform duration-300
          ${isAnimated ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700/50 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{territory.postcode_sector}</h2>
            <p className="text-sm text-gray-400">{territory.region}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Assigned Medics */}
          <section>
            <h3 className="text-sm font-semibold text-white mb-3">Assigned Medics</h3>

            {/* Primary Medic */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Primary Medic</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setChangingMedic(changingMedic === 'primary' ? null : 'primary')}
                  className="h-6 text-xs"
                >
                  {changingMedic === 'primary' ? 'Cancel' : 'Change'}
                </Button>
              </div>

              {changingMedic === 'primary' ? (
                <Select onValueChange={(value) => handleAssignMedic(value, 'primary')}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select medic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicScores.map(({ medic, score }) => (
                      <SelectItem key={medic.id} value={medic.id}>
                        {medic.first_name} {medic.last_name} ({score.total_score.toFixed(0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : territory.primary_medic_name ? (
                <div>
                  <div className="text-white font-medium mb-1">
                    {territory.primary_medic_name}
                  </div>
                  {primaryMedicScore && (
                    <div className="text-xs text-gray-400 break-words">
                      {formatScoreBreakdown(primaryMedicScore)}
                    </div>
                  )}
                </div>
              ) : (
                <Badge variant="destructive" className="bg-red-600">Unassigned</Badge>
              )}
            </div>

            {/* Secondary Medic */}
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Secondary Medic</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setChangingMedic(changingMedic === 'secondary' ? null : 'secondary')}
                  className="h-6 text-xs"
                >
                  {changingMedic === 'secondary' ? 'Cancel' : 'Change'}
                </Button>
              </div>

              {changingMedic === 'secondary' ? (
                <Select onValueChange={(value) => handleAssignMedic(value, 'secondary')}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select medic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicScores.map(({ medic, score }) => (
                      <SelectItem key={medic.id} value={medic.id}>
                        {medic.first_name} {medic.last_name} ({score.total_score.toFixed(0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : territory.secondary_medic_name ? (
                <div>
                  <div className="text-white font-medium mb-1">
                    {territory.secondary_medic_name}
                  </div>
                  {secondaryMedicScore && (
                    <div className="text-xs text-gray-400 break-words">
                      {formatScoreBreakdown(secondaryMedicScore)}
                    </div>
                  )}
                </div>
              ) : (
                <Badge variant="secondary" className="bg-gray-700">None</Badge>
              )}
            </div>
          </section>

          {/* Utilization */}
          <section>
            <h3 className="text-sm font-semibold text-white mb-3">Utilization</h3>
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-white">
                  {territory.utilization_pct}%
                </span>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Minus className="w-4 h-4" />
                  <span>Stable</span>
                </div>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getUtilizationColor(territory.utilization_pct)}`}
                  style={{ width: `${Math.min(100, territory.utilization_pct)}%` }}
                />
              </div>
            </div>
          </section>

          {/* Metrics Summary */}
          <section>
            <h3 className="text-sm font-semibold text-white mb-3">Metrics Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">Total Bookings</div>
                <div className="text-lg font-bold text-white">
                  {territory.recent_metrics.total_bookings}
                </div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">Confirmed</div>
                <div className="text-lg font-bold text-green-500">
                  {territory.recent_metrics.confirmed_bookings}
                </div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">Rejected</div>
                <div className="text-lg font-bold text-red-500">
                  {territory.recent_metrics.rejected_bookings}
                </div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="text-xs text-gray-400 mb-1">Rejection Rate</div>
                <div className={`text-lg font-bold ${
                  territory.recent_metrics.rejection_rate > 25 ? 'text-red-500' :
                  territory.recent_metrics.rejection_rate > 10 ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  {territory.recent_metrics.rejection_rate.toFixed(1)}%
                </div>
              </div>
            </div>
          </section>

          {/* Recent Bookings */}
          <section>
            <h3 className="text-sm font-semibold text-white mb-3">Recent Bookings</h3>
            <div className="space-y-2">
              {recentBookings.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">
                  No recent bookings
                </div>
              ) : (
                recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm text-white">
                        {new Date(booking.shift_date).toLocaleDateString('en-GB')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {booking.shift_hours}h shift
                      </div>
                    </div>
                    <Badge className={getStatusBadge(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Territory Notes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Territory Notes</h3>
              {!editingNotes && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingNotes(true)}
                  className="h-6 text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm min-h-[100px]"
                  placeholder="Add notes about this territory..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={updateNotes.isPending}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingNotes(false);
                      setNotes(territory.notes || '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-sm text-gray-300">
                {territory.notes || 'No notes yet'}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
