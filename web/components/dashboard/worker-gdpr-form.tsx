'use client';

/**
 * WorkerGdprForm
 *
 * Submits a GDPR data export or deletion request on behalf of a worker.
 * Inserts into the erasure_requests table. Admin processes via /admin/gdpr.
 *
 * Workers are DB records (not auth users), so the form is admin-submitted.
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WorkerGdprFormProps {
  workerId: string;
  workerName: string;
}

export function WorkerGdprForm({ workerId, workerName }: WorkerGdprFormProps) {
  const { orgId } = useOrg();
  const [requestType, setRequestType] = useState<'export' | 'deletion'>('export');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      toast.error('Organisation not found');
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('erasure_requests').insert({
      org_id: orgId,
      // worker_id stored in notes since erasure_requests is medic/user-scoped
      // Admin will process this manually from the GDPR dashboard
      user_id: workerId,
      request_type: requestType,
      status: 'pending',
      notes: `Worker: ${workerName}. ${reason || 'No additional reason provided.'}`,
      requested_at: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Failed to submit GDPR request:', error);
      toast.error('Failed to submit request. Please try again.');
    } else {
      setSubmitted(true);
      toast.success('GDPR request submitted successfully');
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
        Request submitted. It will appear in the{' '}
        <a href="/admin/gdpr" className="underline font-medium">GDPR dashboard</a>{' '}
        for processing within 1 calendar month (UK GDPR requirement).
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1.5">Request Type</label>
        <select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as 'export' | 'deletion')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="export">Data Export (Art. 15 — Right of Access)</option>
          <option value="deletion">Data Deletion (Art. 17 — Right to Erasure)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Reason <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Worker requested data export by phone on 15 Feb 2026"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} variant="outline">
        {isSubmitting ? 'Submitting…' : 'Submit GDPR Request'}
      </Button>
    </form>
  );
}
