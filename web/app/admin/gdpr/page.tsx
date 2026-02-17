/**
 * Admin GDPR Data Requests Page
 *
 * Manage GDPR erasure and data export requests from medics/users.
 * Reads from the erasure_requests table.
 * Triggers gdpr-export-data and gdpr-delete-data edge functions.
 *
 * DB table: erasure_requests (id, org_id, user_id, request_type, status,
 *           requested_at, completed_at, completed_by, notes)
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { Shield, Download, Trash2, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ErasureRequest {
  id: string;
  user_id: string;
  request_type: 'export' | 'deletion';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requested_at: string;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  profile?: { email?: string; full_name?: string };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="w-3 h-3" /> },
};

export default function GdprPage() {
  const { org } = useOrg();
  const [requests, setRequests] = useState<ErasureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function fetchRequests() {
    if (!org?.id) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('erasure_requests')
      .select('*')
      .eq('org_id', org.id)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching GDPR requests:', error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, [org?.id]);

  async function handleProcess(request: ErasureRequest) {
    setProcessingId(request.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      // Call the appropriate edge function
      const fnName = request.request_type === 'export' ? 'gdpr-export-data' : 'gdpr-delete-data';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { user_id: request.user_id, request_id: request.id },
      });

      if (error) throw error;

      if (request.request_type === 'export' && data?.download_url) {
        // Open export download in new tab
        window.open(data.download_url, '_blank');
        toast.success('Data export triggered — download will open in new tab');
      } else {
        toast.success(`GDPR ${request.request_type} request processed`);
      }

      // Mark as completed
      await supabase
        .from('erasure_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
        })
        .eq('id', request.id);

      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? { ...r, status: 'completed', completed_at: new Date().toISOString() }
            : r
        )
      );
    } catch (err) {
      console.error('GDPR processing error:', err);
      toast.error('Failed to process request. Please try again.');
    }
    setProcessingId(null);
  }

  async function handleReject(requestId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('erasure_requests')
      .update({
        status: 'rejected',
        completed_at: new Date().toISOString(),
        completed_by: user?.id,
      })
      .eq('id', requestId);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      toast.success('Request rejected');
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r))
      );
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">GDPR Data Requests</h1>
          <p className="text-gray-400 mt-1">Manage user data export and deletion requests (UK GDPR Art. 15-17)</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-600/30 px-4 py-2 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-300 text-sm font-medium">{pendingCount} pending request{pendingCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* UK GDPR note */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4 flex gap-3">
        <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200">
          <strong>Compliance notice:</strong> Under UK GDPR, data access requests must be responded to within{' '}
          <strong>1 calendar month</strong>. Deletion requests should be completed unless a legal basis for retention exists.
        </div>
      </div>

      {/* Requests */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <Shield className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No GDPR requests</p>
          <p className="text-gray-500 text-sm mt-1">Data requests from users will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const status = statusConfig[request.status] ?? statusConfig.pending;
            const isPending = request.status === 'pending' || request.status === 'in_progress';
            return (
              <div
                key={request.id}
                className={`bg-gray-800/50 border rounded-2xl p-5 ${
                  isPending ? 'border-yellow-700/30' : 'border-gray-700/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        request.request_type === 'export'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {request.request_type === 'export' ? '📤 Data Export' : '🗑️ Data Deletion'}
                      </span>
                    </div>
                    <p className="text-white font-medium">
                      {request.profile?.full_name ?? 'Unknown User'}
                    </p>
                    <p className="text-gray-400 text-sm">{request.profile?.email ?? request.user_id}</p>
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Clock className="w-3 h-3" />
                      Requested {format(new Date(request.requested_at), 'dd MMM yyyy HH:mm')}
                      {request.completed_at && (
                        <> · Completed {format(new Date(request.completed_at), 'dd MMM yyyy HH:mm')}</>
                      )}
                    </div>
                    {request.notes && <p className="text-gray-400 text-sm italic">"{request.notes}"</p>}
                  </div>
                  {isPending && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleProcess(request)}
                        disabled={processingId === request.id}
                        className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl transition-all text-sm font-medium disabled:opacity-50 ${
                          request.request_type === 'export'
                            ? 'bg-blue-600 hover:bg-blue-500'
                            : 'bg-red-600 hover:bg-red-500'
                        }`}
                      >
                        {request.request_type === 'export' ? (
                          <><Download className="w-4 h-4" /> Export</>
                        ) : (
                          <><Trash2 className="w-4 h-4" /> Delete</>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="px-3 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
