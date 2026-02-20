/**
 * Roster Medic Card Component
 * Phase 37: Company Accounts — Plan 02
 *
 * WHY: Displays individual medic information in the roster grid.
 * Shows status badges, qualifications, availability, and action buttons.
 *
 * FEATURES:
 * - Medic name, title, email display
 * - Status badge (green=active, amber=pending, gray=inactive, red=suspended)
 * - Qualification badges
 * - Temporary unavailability indicator with date range
 * - Action buttons: Edit, Remove (with confirmation dialog)
 * - Pending invitations: shows "Invitation sent" with date + resend option
 * - Remove calls DELETE /api/marketplace/roster/[id] (soft-delete)
 * - Sonner toast for success/error feedback
 */

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CompanyRosterMedicWithDetails } from '@/lib/marketplace/roster-types';
import type { RosterMedicStatus } from '@/lib/marketplace/roster-types';
import { STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';
import type { StaffingRole } from '@/lib/marketplace/event-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, RefreshCw, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

interface RosterMedicCardProps {
  medic: CompanyRosterMedicWithDetails;
  companyId: string;
}

// =============================================================================
// Status badge config
// =============================================================================

const STATUS_BADGE_STYLES: Record<RosterMedicStatus, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  inactive: 'bg-gray-50 text-gray-500 border-gray-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<RosterMedicStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export default function RosterMedicCard({ medic, companyId }: RosterMedicCardProps) {
  const queryClient = useQueryClient();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // =========================================================================
  // Check if medic is temporarily unavailable
  // =========================================================================
  const now = new Date();
  const unavailableFrom = medic.unavailable_from ? new Date(medic.unavailable_from) : null;
  const unavailableUntil = medic.unavailable_until ? new Date(medic.unavailable_until) : null;
  const isTemporarilyUnavailable =
    unavailableFrom && unavailableUntil && now >= unavailableFrom && now <= unavailableUntil;

  // =========================================================================
  // Remove handler (soft-delete via DELETE API)
  // =========================================================================
  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const res = await fetch(`/api/marketplace/roster/${medic.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove medic');
      }

      toast.success('Medic removed from roster');
      queryClient.invalidateQueries({ queryKey: ['company-roster'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove medic';
      toast.error(message);
    } finally {
      setIsRemoving(false);
    }
  };

  // =========================================================================
  // Resend invitation handler
  // =========================================================================
  const handleResend = async () => {
    if (!medic.invitation_email) return;

    setIsResending(true);
    try {
      const res = await fetch('/api/marketplace/roster/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          email: medic.invitation_email,
          title: medic.title,
          qualifications: medic.qualifications,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // If already pending, that's fine for a resend scenario
        if (res.status === 409) {
          toast.info('Invitation already sent to this email');
        } else {
          throw new Error(data.error || 'Failed to resend invitation');
        }
      } else {
        toast.success(`Invitation resent to ${medic.invitation_email}`);
        queryClient.invalidateQueries({ queryKey: ['company-roster'] });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend invitation';
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  // =========================================================================
  // Format invitation date
  // =========================================================================
  const invitationDate = medic.invitation_sent_at
    ? new Date(medic.invitation_sent_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="border rounded-lg p-5 space-y-3 hover:shadow-sm transition-shadow">
      {/* Header: Name + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {medic.medic_name || medic.invitation_email || 'Unknown'}
            </p>
            {medic.title && (
              <p className="text-sm text-gray-500 truncate">{medic.title}</p>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={`flex-shrink-0 ${STATUS_BADGE_STYLES[medic.status]}`}
        >
          {STATUS_LABELS[medic.status]}
        </Badge>
      </div>

      {/* Email */}
      {medic.medic_email && medic.medic_email !== medic.medic_name && (
        <p className="text-xs text-gray-400 truncate">{medic.medic_email}</p>
      )}

      {/* Qualification badges */}
      {medic.qualifications && medic.qualifications.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {medic.qualifications.map((qual) => (
            <Badge
              key={qual}
              variant="secondary"
              className="text-xs"
            >
              {STAFFING_ROLE_LABELS[qual as StaffingRole] || qual}
            </Badge>
          ))}
        </div>
      )}

      {/* Temporary unavailability */}
      {isTemporarilyUnavailable && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Temporarily unavailable{' '}
            {unavailableFrom && unavailableUntil && (
              <>
                {unavailableFrom.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                {' - '}
                {unavailableUntil.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </>
            )}
          </span>
        </div>
      )}

      {/* Pending invitation info */}
      {medic.status === 'pending' ? (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-amber-600">
            Invitation sent {invitationDate || 'recently'}
          </p>
          <Button
            onClick={handleResend}
            disabled={isResending}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isResending ? 'animate-spin' : ''}`} />
            {isResending ? 'Resending...' : 'Resend Invitation'}
          </Button>
        </div>
      ) : medic.status === 'active' ? (
        /* Action buttons for active medics */
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              // Edit functionality - placeholder for now
              toast.info('Edit functionality coming soon');
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                disabled={isRemoving}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from roster?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will set {medic.medic_name || 'this medic'} to inactive on your roster.
                  They will no longer appear in active roster lists or be assignable to quotes.
                  This action can be reversed by re-adding them.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isRemoving ? 'Removing...' : 'Remove'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}
    </div>
  );
}
