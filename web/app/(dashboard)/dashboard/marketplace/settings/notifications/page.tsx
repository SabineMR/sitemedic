/**
 * /dashboard/marketplace/settings/notifications
 *
 * Notification preferences settings page.
 * Users configure their channel × category matrix here:
 *  - Email on/off per category
 *  - SMS on/off per applicable category (with PECR opt-in)
 *  - Event alert radius in miles
 *
 * Phase 38: Notifications & Alerts — Plan 04
 */

import Link from 'next/link';
import { ArrowLeft, Bell } from 'lucide-react';
import { NotificationPreferencesForm } from '@/components/dashboard/NotificationPreferencesForm';

export const metadata = {
  title: 'Notification Preferences | SiteMedic Marketplace',
};

export default function NotificationPreferencesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      {/* Back link */}
      <Link
        href="/dashboard/marketplace"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      {/* Page header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
          <Bell className="h-6 w-6 text-muted-foreground" />
          Notification Preferences
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose how and when SiteMedic notifies you about marketplace activity.
          The dashboard channel is always on; email and SMS can be configured per category.
        </p>
      </div>

      {/* Preferences form */}
      <NotificationPreferencesForm />
    </div>
  );
}
