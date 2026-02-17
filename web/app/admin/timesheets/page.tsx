/**
 * Timesheets Page - Admin Batch Approval
 *
 * Friday payout workflow: Review and batch-approve timesheets for medic payments.
 * Performance target: 20 timesheets approved in <5 minutes.
 */

import { Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { fetchPendingTimesheets } from '@/lib/queries/admin/timesheets';
import { TimesheetBatchApproval } from '@/components/admin/timesheet-batch-approval';
import { getCurrentOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export default async function TimesheetsPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId() ?? '';
  const initialTimesheets = await fetchPendingTimesheets(supabase, orgId);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-500" />
            Timesheets
          </h1>
          <p className="text-gray-400 mt-1">
            Review and approve timesheets for Friday payouts
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">Pending Approval</div>
            <div className="text-2xl font-bold text-yellow-500">
              {initialTimesheets.length}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Approval Component */}
      <TimesheetBatchApproval initialData={initialTimesheets} />
    </div>
  );
}
