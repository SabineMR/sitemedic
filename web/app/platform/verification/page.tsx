/**
 * Platform Admin Verification Queue
 * Phase 32-03: Marketplace Verification
 *
 * Lists all pending/info-requested marketplace company registrations
 * sorted oldest-first (FIFO for fair processing).
 * Each row links to the detail page at /platform/verification/{id}.
 *
 * Pattern follows: web/app/platform/organizations/page.tsx
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ShieldCheck,
  Search,
  FileText,
  Clock,
  Building2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import type { VerificationStatus } from '@/lib/marketplace/types';

interface QueueCompany {
  id: string;
  company_name: string;
  company_email: string;
  cqc_provider_id: string;
  cqc_auto_verified: boolean;
  cqc_registration_status: string;
  verification_status: VerificationStatus;
  created_at: string;
  compliance_documents: { count: number }[] | number;
}

type TabFilter = 'pending' | 'info_requested' | 'all';

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'info_requested', label: 'Info Requested' },
  { value: 'all', label: 'All' },
];

export default function VerificationQueuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<QueueCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>(
    (searchParams.get('tab') as TabFilter) || 'pending'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from('marketplace_companies')
        .select(`
          id, company_name, company_email, cqc_provider_id,
          cqc_auto_verified, cqc_registration_status,
          verification_status, created_at,
          compliance_documents (count)
        `)
        .order('created_at', { ascending: true });

      if (activeTab === 'pending') {
        query = query.in('verification_status', ['pending', 'cqc_verified']);
      } else if (activeTab === 'info_requested') {
        query = query.eq('verification_status', 'info_requested');
      }
      // 'all' tab: no filter

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setCompanies((data as QueueCompany[]) || []);
    } catch (err) {
      console.error('Failed to fetch verification queue:', err);
      setError('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  function getDocumentCount(company: QueueCompany): number {
    if (typeof company.compliance_documents === 'number') {
      return company.compliance_documents;
    }
    if (Array.isArray(company.compliance_documents) && company.compliance_documents.length > 0) {
      return company.compliance_documents[0]?.count || 0;
    }
    return 0;
  }

  // Filter by search query
  const filteredCompanies = companies.filter(
    (c) =>
      c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cqc_provider_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-9 w-80 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-12 w-full mb-6 rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-6">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Marketplace Verification Queue
        </h1>
        <p className="text-purple-300">
          Review and approve marketplace company registrations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.value
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-purple-800/30 text-purple-300 hover:bg-purple-700/50 hover:text-white border border-purple-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          <input
            type="text"
            placeholder="Search by company name, email, or CQC ID..."
            aria-label="Search companies"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-purple-800/30 border border-purple-700/50 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Companies Table */}
      {filteredCompanies.length > 0 ? (
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-700/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  CQC Provider ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  CQC Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-700/30">
              {filteredCompanies.map((company) => (
                <tr
                  key={company.id}
                  onClick={() =>
                    router.push(`/platform/verification/${company.id}`)
                  }
                  className="hover:bg-purple-700/20 cursor-pointer transition-all duration-150"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">
                          {company.company_name}
                        </p>
                        <p className="text-purple-400 text-sm truncate">
                          {company.company_email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-purple-200 text-sm font-mono">
                      {company.cqc_provider_id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {company.cqc_auto_verified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        Auto-verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        <Clock className="w-3 h-3" />
                        Not verified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-purple-200 text-sm">
                      <FileText className="w-4 h-4 text-purple-400" />
                      {getDocumentCount(company)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-purple-300 text-sm">
                      {new Date(company.created_at).toLocaleDateString(
                        'en-GB',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <VerifiedBadge status={company.verification_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16">
          <ShieldCheck className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No pending verifications
          </h3>
          <p className="text-purple-300">
            {searchQuery
              ? 'No companies match your search'
              : activeTab === 'all'
              ? 'No marketplace companies registered yet'
              : 'All caught up! No companies awaiting review.'}
          </p>
        </div>
      )}
    </div>
  );
}
