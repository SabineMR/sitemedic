/**
 * Invite Medic Modal Component
 * Phase 37: Company Accounts — Plan 02
 *
 * WHY: Company admins need to invite medics who may not yet be on the platform.
 * This modal sends an email invitation with a signed JWT link (7-day expiry)
 * via POST /api/marketplace/roster/invite.
 *
 * FEATURES:
 * - Email input (required)
 * - Optional title and qualifications fields
 * - POST to /api/marketplace/roster/invite on submit
 * - Shows note about 7-day expiry
 * - Toast feedback and React Query cache invalidation on success
 */

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCompanyRosterStore } from '@/stores/useCompanyRosterStore';
import { STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface InviteMedicModalProps {
  companyId: string;
}

export default function InviteMedicModal({ companyId }: InviteMedicModalProps) {
  const store = useCompanyRosterStore();
  const queryClient = useQueryClient();

  // Form state
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // Toggle qualification selection
  // =========================================================================
  const toggleQualification = (qual: string) => {
    setSelectedQualifications((prev) =>
      prev.includes(qual) ? prev.filter((q) => q !== qual) : [...prev, qual]
    );
  };

  // =========================================================================
  // Validate email format
  // =========================================================================
  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  // =========================================================================
  // Submit: send invitation
  // =========================================================================
  const handleSubmit = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/roster/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          email: email.trim(),
          title: title || null,
          qualifications: selectedQualifications.length > 0 ? selectedQualifications : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast.success(`Invitation sent to ${email.trim()}`);
      queryClient.invalidateQueries({ queryKey: ['company-roster'] });
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Close and reset
  // =========================================================================
  const handleClose = () => {
    store.closeInviteModal();
    setEmail('');
    setTitle('');
    setSelectedQualifications([]);
    setError(null);
  };

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <Dialog open={store.inviteModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Medic by Email</DialogTitle>
          <DialogDescription>
            Send an email invitation to a medic to join your team roster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email input */}
          <div>
            <Label htmlFor="inviteEmail" className="text-sm">
              Email address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="medic@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="mt-1"
              autoFocus
            />
          </div>

          {/* Optional: Title */}
          <div>
            <Label htmlFor="inviteTitle" className="text-sm">
              Title / Role (optional)
            </Label>
            <Input
              id="inviteTitle"
              placeholder="e.g., Paramedic, Team Lead"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Optional: Qualifications */}
          <div>
            <Label className="text-sm">
              Qualifications (optional)
            </Label>
            <p className="text-xs text-gray-500 mt-0.5 mb-2">
              Pre-assign qualifications for this medic on your roster.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STAFFING_ROLE_LABELS) as Array<[string, string]>).map(
                ([role, label]) => {
                  const isSelected = selectedQualifications.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleQualification(role)}
                      className="inline-block"
                    >
                      <Badge
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? '' : 'hover:bg-gray-50'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 mr-1" />}
                        {label}
                      </Badge>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <span>
              The medic will receive an email invitation valid for 7 days. If they already have a
              SiteMedic account, they can accept immediately. New medics will need to create an
              account first.
            </span>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !email.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-1.5" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
