/**
 * Marketplace Company Verification Detail Page
 * Phase 32-03: Marketplace Verification
 *
 * Shows full company info, CQC status, compliance documents with signed URL
 * previews, and approve/reject/request-info admin actions.
 *
 * Client Component with server-side data fetching via useEffect.
 * Pattern follows: web/app/platform/organizations/page.tsx
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Loader2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import { DOCUMENT_TYPE_LABELS, REQUIRED_DOCUMENT_TYPES } from '@/lib/marketplace/compliance';
import type {
  MarketplaceCompany,
  ComplianceDocument,
  VerificationStatus,
  DocumentType,
} from '@/lib/marketplace/types';

// =============================================================================
// Types
// =============================================================================

interface CompanyDetail extends MarketplaceCompany {
  compliance_documents: ComplianceDocument[];
}

type AdminAction = 'approve' | 'reject' | 'request_info';

// =============================================================================
// Page Component
// =============================================================================

export default function VerificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action state
  const [actionInProgress, setActionInProgress] = useState<AdminAction | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showInfoRequestForm, setShowInfoRequestForm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [actionNotes, setActionNotes] = useState('');

  // CQC re-check state
  const [recheckingCqc, setRecheckingCqc] = useState(false);

  // Document signed URL state
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  // =========================================================================
  // Data Fetching
  // =========================================================================

  const fetchCompany = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('marketplace_companies')
        .select(`
          *,
          compliance_documents (*)
        `)
        .eq('id', companyId)
        .single();

      if (fetchError) throw fetchError;
      setCompany(data as CompanyDetail);
    } catch (err) {
      console.error('Failed to fetch company:', err);
      setError('Failed to load company details');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  // =========================================================================
  // Admin Actions
  // =========================================================================

  async function handleAction(action: AdminAction, notes?: string) {
    setActionInProgress(action);

    try {
      const res = await fetch('/api/marketplace/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          action,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        return;
      }

      const actionLabels: Record<AdminAction, string> = {
        approve: 'Company approved successfully',
        reject: 'Company rejected',
        request_info: 'Information request sent',
      };

      toast.success(actionLabels[action]);

      // Reset forms
      setShowRejectForm(false);
      setShowInfoRequestForm(false);
      setShowApproveConfirm(false);
      setActionNotes('');

      // Navigate back to queue
      router.push('/platform/verification');
    } catch (err) {
      console.error('Action error:', err);
      toast.error('Network error - please try again');
    } finally {
      setActionInProgress(null);
    }
  }

  // =========================================================================
  // CQC Re-check
  // =========================================================================

  async function handleCqcRecheck() {
    if (!company) return;
    setRecheckingCqc(true);

    try {
      // Call the CQC verify API with just a status refresh
      const res = await fetch('/api/marketplace/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          action: 'cqc_recheck',
        }),
      });

      if (res.ok) {
        toast.success('CQC status refreshed');
        await fetchCompany();
      } else {
        const data = await res.json();
        toast.error(data.error || 'CQC re-check failed');
      }
    } catch (err) {
      console.error('CQC re-check error:', err);
      toast.error('Failed to re-check CQC status');
    } finally {
      setRecheckingCqc(false);
    }
  }

  // =========================================================================
  // Document Viewing (Signed URLs)
  // =========================================================================

  async function handleViewDocument(doc: ComplianceDocument) {
    setViewingDocId(doc.id);

    try {
      const supabase = createClient();

      const { data, error: urlError } = await supabase.storage
        .from('compliance-documents')
        .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to generate signed URL:', err);
      toast.error('Failed to open document');
    } finally {
      setViewingDocId(null);
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  function getMissingDocTypes(): DocumentType[] {
    if (!company) return [];
    const uploadedTypes = new Set(
      company.compliance_documents.map((d) => d.document_type)
    );
    return REQUIRED_DOCUMENT_TYPES.filter((t) => !uploadedTypes.has(t));
  }

  function getDocReviewStatusBadge(status: string) {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Pending
          </span>
        );
    }
  }

  // =========================================================================
  // Loading State
  // =========================================================================

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-10 w-96 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full mt-6 rounded-2xl" />
      </div>
    );
  }

  // =========================================================================
  // Error State
  // =========================================================================

  if (error || !company) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-6">
          <p className="text-red-300">{error || 'Company not found'}</p>
        </div>
      </div>
    );
  }

  const missingDocs = getMissingDocTypes();
  const isActionable = ['pending', 'cqc_verified', 'info_requested'].includes(
    company.verification_status
  );

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="p-8 max-w-6xl">
      {/* Back Button */}
      <button
        onClick={() => router.push('/platform/verification')}
        className="flex items-center gap-2 text-purple-300 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Verification Queue
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center">
          <Building2 className="w-7 h-7 text-purple-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white">
              {company.company_name}
            </h1>
            <VerifiedBadge status={company.verification_status} size="md" />
          </div>
          <p className="text-purple-300">
            Registered{' '}
            {new Date(company.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ================================================================= */}
        {/* Company Information */}
        {/* ================================================================= */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Company Information
          </h2>

          <div className="space-y-3">
            {company.company_reg_number && (
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-purple-400 text-xs">Registration Number</p>
                  <p className="text-white text-sm">{company.company_reg_number}</p>
                </div>
              </div>
            )}

            {company.company_address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-purple-400 text-xs">Address</p>
                  <p className="text-white text-sm">
                    {company.company_address}
                    {company.company_postcode && `, ${company.company_postcode}`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-purple-400 text-xs">Email</p>
                <p className="text-white text-sm">{company.company_email}</p>
              </div>
            </div>

            {company.company_phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-purple-400 text-xs">Phone</p>
                  <p className="text-white text-sm">{company.company_phone}</p>
                </div>
              </div>
            )}

            {company.coverage_areas && company.coverage_areas.length > 0 && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-purple-400 text-xs">Coverage Areas</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {company.coverage_areas.map((area) => (
                      <span
                        key={area}
                        className="px-2 py-0.5 text-xs bg-purple-700/50 text-purple-200 rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {company.company_description && (
              <div className="pt-3 border-t border-purple-700/30">
                <p className="text-purple-400 text-xs mb-1">Description</p>
                <p className="text-purple-200 text-sm leading-relaxed">
                  {company.company_description}
                </p>
              </div>
            )}

            {company.org_id && (
              <div className="pt-3 border-t border-purple-700/30">
                <p className="text-purple-400 text-xs mb-1">
                  Linked SiteMedic Organisation
                </p>
                <a
                  href={`/platform/organizations`}
                  className="text-purple-300 hover:text-white text-sm inline-flex items-center gap-1 transition-colors"
                >
                  View Organisation
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* CQC Verification */}
        {/* ================================================================= */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            CQC Verification
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-xs">CQC Provider ID</p>
                <a
                  href={`https://www.cqc.org.uk/provider/${company.cqc_provider_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-mono text-sm hover:text-purple-300 inline-flex items-center gap-1 transition-colors"
                >
                  {company.cqc_provider_id}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <button
                onClick={handleCqcRecheck}
                disabled={recheckingCqc}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all disabled:opacity-50"
              >
                {recheckingCqc ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Re-check CQC
              </button>
            </div>

            <div>
              <p className="text-purple-400 text-xs mb-1">Auto-Verified</p>
              {company.cqc_auto_verified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  <ShieldCheck className="w-4 h-4" />
                  Yes - CQC Registered
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  <AlertTriangle className="w-4 h-4" />
                  Not auto-verified
                </span>
              )}
            </div>

            <div>
              <p className="text-purple-400 text-xs mb-1">Registration Status</p>
              <p className="text-white text-sm font-medium">
                {company.cqc_registration_status || 'Unknown'}
              </p>
            </div>

            {company.cqc_last_checked_at && (
              <div>
                <p className="text-purple-400 text-xs mb-1">Last Checked</p>
                <p className="text-purple-200 text-sm">
                  {new Date(company.cqc_last_checked_at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* Compliance Documents */}
      {/* =================================================================== */}
      <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          Compliance Documents
        </h2>

        {company.compliance_documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Certificate No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-700/30">
                {company.compliance_documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-purple-700/10">
                    <td className="px-4 py-3">
                      <span className="text-white text-sm font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ||
                          doc.document_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-purple-200 text-sm truncate max-w-[200px] block">
                        {doc.file_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.expiry_date ? (
                        <span
                          className={`text-sm ${
                            new Date(doc.expiry_date) < new Date()
                              ? 'text-red-400 font-medium'
                              : 'text-purple-200'
                          }`}
                        >
                          {new Date(doc.expiry_date).toLocaleDateString(
                            'en-GB',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </span>
                      ) : (
                        <span className="text-purple-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-purple-200 text-sm">
                        {doc.certificate_number || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getDocReviewStatusBadge(doc.review_status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        disabled={viewingDocId === doc.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                      >
                        {viewingDocId === doc.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-purple-400 text-sm">
            No documents uploaded yet.
          </p>
        )}

        {/* Missing Documents Warning */}
        {missingDocs.length > 0 && (
          <div className="mt-4 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-amber-300 text-sm font-medium">
                Missing Required Documents
              </p>
            </div>
            <ul className="space-y-1">
              {missingDocs.map((type) => (
                <li
                  key={type}
                  className="text-amber-200/70 text-sm pl-6"
                >
                  - {DOCUMENT_TYPE_LABELS[type]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* Admin Actions */}
      {/* =================================================================== */}
      {isActionable && (
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Admin Actions</h2>

          {/* Approve Confirmation */}
          {showApproveConfirm && (
            <div className="mb-4 bg-green-900/20 border border-green-700/40 rounded-xl p-4">
              <p className="text-green-300 text-sm mb-3">
                This will allow <strong>{company.company_name}</strong> to
                submit quotes on the marketplace. All pending documents will be
                marked as approved. Continue?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionInProgress === 'approve'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-all"
                >
                  {actionInProgress === 'approve' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Confirm Approval
                </button>
                <button
                  onClick={() => setShowApproveConfirm(false)}
                  className="px-4 py-2 text-purple-300 hover:text-white text-sm font-medium rounded-lg border border-purple-700/50 hover:bg-purple-700/30 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-xl p-4">
              <p className="text-red-300 text-sm mb-3">
                Provide a reason for rejecting{' '}
                <strong>{company.company_name}</strong>:
              </p>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Explain why this registration is being rejected..."
                className="w-full px-4 py-3 bg-red-900/30 border border-red-700/40 rounded-lg text-white placeholder-red-400/50 text-sm focus:outline-none focus:border-red-500 transition-all resize-none"
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAction('reject', actionNotes)}
                  disabled={
                    actionInProgress === 'reject' || !actionNotes.trim()
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-all"
                >
                  {actionInProgress === 'reject' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Confirm Rejection
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setActionNotes('');
                  }}
                  className="px-4 py-2 text-purple-300 hover:text-white text-sm font-medium rounded-lg border border-purple-700/50 hover:bg-purple-700/30 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Request Info Form */}
          {showInfoRequestForm && (
            <div className="mb-4 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
              <p className="text-amber-300 text-sm mb-3">
                Specify what additional information is needed from{' '}
                <strong>{company.company_name}</strong>:
              </p>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Describe what documents or information are needed..."
                className="w-full px-4 py-3 bg-amber-900/30 border border-amber-700/40 rounded-lg text-white placeholder-amber-400/50 text-sm focus:outline-none focus:border-amber-500 transition-all resize-none"
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAction('request_info', actionNotes)}
                  disabled={
                    actionInProgress === 'request_info' ||
                    !actionNotes.trim()
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-all"
                >
                  {actionInProgress === 'request_info' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  Send Request
                </button>
                <button
                  onClick={() => {
                    setShowInfoRequestForm(false);
                    setActionNotes('');
                  }}
                  className="px-4 py-2 text-purple-300 hover:text-white text-sm font-medium rounded-lg border border-purple-700/50 hover:bg-purple-700/30 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons (only show when no form is open) */}
          {!showApproveConfirm &&
            !showRejectForm &&
            !showInfoRequestForm && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg shadow-green-500/20"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg shadow-red-500/20"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
                <button
                  onClick={() => setShowInfoRequestForm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg shadow-amber-500/20"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Request More Info
                </button>
              </div>
            )}
        </div>
      )}

      {/* Show status info for non-actionable companies */}
      {!isActionable && (
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-2">Status</h2>
          <div className="flex items-center gap-3">
            <VerifiedBadge status={company.verification_status} size="md" />
            {company.verification_status === 'rejected' &&
              company.rejection_reason && (
                <p className="text-red-300 text-sm">
                  Reason: {company.rejection_reason}
                </p>
              )}
            {company.verification_status === 'suspended' &&
              company.suspension_reason && (
                <p className="text-red-300 text-sm">
                  Reason: {company.suspension_reason}
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
