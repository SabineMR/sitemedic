/**
 * Territory Assignment Panel
 *
 * Drag-drop interface for assigning primary and secondary medics to territories.
 * Uses @dnd-kit/core for accessible drag-and-drop with keyboard support.
 *
 * Layout:
 * - Left sidebar: Available medics (draggable cards)
 * - Right area: Territory table with drop zones for primary/secondary slots
 */

'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { GripVertical, X, UserPlus } from 'lucide-react';
import { useMedics } from '@/lib/queries/admin/medics';
import { useTerritories, useAssignMedicToTerritory, useUnassignMedic } from '@/lib/queries/admin/territories';
import { getUtilizationColor, getUtilizationTextColor } from '@/lib/queries/admin/medics';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// =============================================================================
// DRAGGABLE MEDIC CARD
// =============================================================================

interface MedicCardProps {
  medic: any;
  isDragging?: boolean;
}

function MedicCard({ medic, isDragging = false }: MedicCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: medic.id,
    disabled: !medic.available_for_work,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const utilizationColor = getUtilizationColor(medic.utilization_pct);
  const utilizationTextColor = getUtilizationTextColor(medic.utilization_pct);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-lg p-4
        ${!medic.available_for_work ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
        ${isDragging ? 'opacity-50' : ''}
      `}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <GripVertical className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Medic name */}
          <div className="text-white font-medium">
            {medic.first_name} {medic.last_name}
          </div>

          {/* Utilization bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-400">Utilization</span>
              <span className={utilizationTextColor}>
                {medic.utilization_pct}%
              </span>
            </div>
            <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${utilizationColor} transition-all`}
                style={{ width: `${Math.min(100, medic.utilization_pct)}%` }}
              />
            </div>
          </div>

          {/* Territory count & rating */}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span>{medic.territory_assignments.length} territories</span>
            <span>⭐ {medic.star_rating.toFixed(1)}</span>
          </div>

          {/* Unavailable status */}
          {!medic.available_for_work && (
            <div className="mt-2 text-sm text-red-400">
              Unavailable{medic.unavailable_until ? ` until ${new Date(medic.unavailable_until).toLocaleDateString('en-GB')}` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DROPPABLE SLOT
// =============================================================================

interface DropSlotProps {
  territoryId: string;
  role: 'primary' | 'secondary';
  medicName: string | null;
  onUnassign: () => void;
}

function DropSlot({ territoryId, role, medicName, onUnassign }: DropSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${territoryId}:${role}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[60px] rounded-lg border-2 border-dashed transition-all
        ${isOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700/50'}
        ${medicName ? 'bg-gray-800/30' : 'bg-transparent'}
      `}
    >
      {medicName ? (
        <div className="flex items-center justify-between p-3">
          <span className="text-white text-sm">{medicName}</span>
          <button
            onClick={onUnassign}
            className="text-gray-400 hover:text-red-400 transition-colors"
            aria-label={`Unassign ${medicName}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full p-3 text-gray-500 text-sm">
          Drop medic here
        </div>
      )}
    </div>
  );
}

// =============================================================================
// KEYBOARD FALLBACK SELECT
// =============================================================================

interface KeyboardAssignProps {
  territoryId: string;
  role: 'primary' | 'secondary';
  medics: any[];
  onAssign: (medicId: string) => void;
}

function KeyboardAssign({ territoryId, role, medics, onAssign }: KeyboardAssignProps) {
  const [selectedMedicId, setSelectedMedicId] = useState<string>('');

  const availableMedics = medics.filter(m => m.available_for_work);

  const handleAssign = () => {
    if (selectedMedicId) {
      onAssign(selectedMedicId);
      setSelectedMedicId('');
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Select value={selectedMedicId} onValueChange={setSelectedMedicId}>
        <SelectTrigger className="h-8 text-sm bg-gray-800/50 border-gray-700/50 text-white">
          <SelectValue placeholder="Select medic..." />
        </SelectTrigger>
        <SelectContent>
          {availableMedics.map(medic => (
            <SelectItem key={medic.id} value={medic.id}>
              {medic.first_name} {medic.last_name} ({medic.utilization_pct}%)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        onClick={handleAssign}
        disabled={!selectedMedicId}
        className="h-8"
      >
        <UserPlus className="w-4 h-4" />
      </Button>
    </div>
  );
}

// =============================================================================
// MAIN ASSIGNMENT PANEL
// =============================================================================

export default function AssignmentPanel() {
  const { data: medics = [], isLoading: medicsLoading } = useMedics();
  const { data: territories = [], isLoading: territoriesLoading } = useTerritories();
  const assignMedic = useAssignMedicToTerritory();
  const unassignMedic = useUnassignMedic();

  const [activeMedicId, setActiveMedicId] = useState<string | null>(null);
  const [medicSearch, setMedicSearch] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // Filter medics
  const filteredMedics = medics.filter(medic => {
    const nameMatch = `${medic.first_name} ${medic.last_name}`
      .toLowerCase()
      .includes(medicSearch.toLowerCase());
    const availableMatch = !showOnlyAvailable || medic.available_for_work;
    return nameMatch && availableMatch;
  });

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveMedicId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveMedicId(null);

    const { active, over } = event;
    if (!over) return;

    // Extract medic_id from active.id
    const medicId = active.id as string;

    // Extract territory_id and role from over.id (format: "territoryId:role")
    const [territoryId, role] = (over.id as string).split(':');

    if (!territoryId || !role) return;

    // Call mutation
    assignMedic.mutate({
      territory_id: territoryId,
      medic_id: medicId,
      role: role as 'primary' | 'secondary',
    });
  };

  const handleUnassign = (territoryId: string, role: 'primary' | 'secondary') => {
    unassignMedic.mutate({ territory_id: territoryId, role });
  };

  const handleKeyboardAssign = (
    territoryId: string,
    role: 'primary' | 'secondary',
    medicId: string
  ) => {
    assignMedic.mutate({
      territory_id: territoryId,
      medic_id: medicId,
      role,
    });
  };

  const activeMedic = medics.find(m => m.id === activeMedicId);

  if (medicsLoading || territoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading assignment panel...</div>
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 h-full">
        {/* Left sidebar: Available medics */}
        <div className="w-1/3 flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-4">Available Medics</h2>

            {/* Search */}
            <Input
              type="text"
              placeholder="Search medics..."
              aria-label="Search medics for territory assignment"
              value={medicSearch}
              onChange={e => setMedicSearch(e.target.value)}
              className="mb-3 bg-gray-800/50 border-gray-700/50 text-white"
            />

            {/* Show only available toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyAvailable}
                onChange={e => setShowOnlyAvailable(e.target.checked)}
                className="rounded"
              />
              Show only available
            </label>
          </div>

          {/* Medic cards */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {filteredMedics.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No medics found
              </div>
            ) : (
              filteredMedics.map(medic => (
                <MedicCard key={medic.id} medic={medic} />
              ))
            )}
          </div>
        </div>

        {/* Right area: Territory table */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4">Territory Assignments</h2>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              {territories.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No territories found
                </div>
              ) : (
                territories.map(territory => (
                  <div
                    key={territory.id}
                    className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-lg p-4"
                  >
                    {/* Territory header */}
                    <div className="mb-3">
                      <h3 className="text-white font-medium">
                        {territory.postcode_sector}
                      </h3>
                      <div className="text-sm text-gray-400">
                        {territory.region} • {territory.utilization_pct}% utilization
                      </div>
                    </div>

                    {/* Assignment slots */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Primary slot */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Primary Medic
                        </label>
                        <DropSlot
                          territoryId={territory.id}
                          role="primary"
                          medicName={territory.primary_medic_name}
                          onUnassign={() => handleUnassign(territory.id, 'primary')}
                        />
                        <KeyboardAssign
                          territoryId={territory.id}
                          role="primary"
                          medics={medics}
                          onAssign={medicId =>
                            handleKeyboardAssign(territory.id, 'primary', medicId)
                          }
                        />
                      </div>

                      {/* Secondary slot */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Secondary Medic
                        </label>
                        <DropSlot
                          territoryId={territory.id}
                          role="secondary"
                          medicName={territory.secondary_medic_name}
                          onUnassign={() => handleUnassign(territory.id, 'secondary')}
                        />
                        <KeyboardAssign
                          territoryId={territory.id}
                          role="secondary"
                          medics={medics}
                          onAssign={medicId =>
                            handleKeyboardAssign(territory.id, 'secondary', medicId)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeMedic ? <MedicCard medic={activeMedic} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
