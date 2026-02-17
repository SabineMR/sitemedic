/**
 * Admin Notifications Page
 *
 * View all system notifications for this organisation:
 * booking updates, RIDDOR alerts, certification warnings, medic alerts.
 * Fetches from medic_alerts table and system events.
 */

'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Calendar, ShieldAlert, Award, CheckCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  alert_type: string;
  alert_severity: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
  resolved_at: string | null;
  medic_id: string | null;
}

const SEVERITY_STYLES = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-300',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  booking: <Calendar className="w-5 h-5" />,
  riddor: <ShieldAlert className="w-5 h-5" />,
  certification: <Award className="w-5 h-5" />,
  medic: <AlertTriangle className="w-5 h-5" />,
};

export default function NotificationsPage() {
  const { org } = useOrg();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  async function fetchNotifications() {
    if (!org?.id) return;
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('medic_alerts')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchNotifications();
  }, [org?.id]);

  async function markResolved(id: string) {
    const supabase = createClient();
    await supabase
      .from('medic_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, resolved_at: new Date().toISOString() } : n))
    );
  }

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.alert_severity === filter);

  const unresolved = notifications.filter((n) => !n.resolved_at).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-400" />
              Notifications
              {unresolved > 0 && (
                <span className="text-sm font-normal px-2.5 py-1 bg-red-500 rounded-full">
                  {unresolved} unresolved
                </span>
              )}
            </h1>
            <p className="text-gray-400 text-sm">
              System alerts, booking updates, and compliance warnings
            </p>
          </div>
          <Button
            onClick={fetchNotifications}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="p-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white border border-gray-700/50'
              }`}
            >
              {f}
              {f === 'all' && ` (${notifications.length})`}
              {f !== 'all' && ` (${notifications.filter((n) => n.alert_severity === f).length})`}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <CheckCircle className="w-12 h-12 mb-3 text-green-500/50" />
            <p className="text-lg font-medium">All clear</p>
            <p className="text-sm mt-1">No notifications to show</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const icon = TYPE_ICONS[n.alert_type] ?? <Bell className="w-5 h-5" />;
              const style = SEVERITY_STYLES[n.alert_severity] ?? SEVERITY_STYLES.info;
              const isResolved = !!n.resolved_at;

              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    isResolved ? 'opacity-50' : style
                  }`}
                >
                  <span className="mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.message}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(n.created_at).toLocaleString('en-GB')}
                      {isResolved && (
                        <span className="ml-2 text-green-400">
                          · Resolved {new Date(n.resolved_at!).toLocaleString('en-GB')}
                        </span>
                      )}
                    </p>
                  </div>
                  {!isResolved && (
                    <button
                      onClick={() => markResolved(n.id)}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 transition-colors"
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
