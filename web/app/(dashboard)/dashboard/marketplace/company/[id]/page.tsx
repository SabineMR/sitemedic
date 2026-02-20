/**
 * Company Profile Page
 * Phase 37: Company Accounts -- Plan 03
 *
 * Public company profile at /dashboard/marketplace/company/[id].
 * Displays company stats, team preview, and ratings summary.
 *
 * WHY: Clients need to see rich company profiles to make informed
 * award decisions. Companies can also view their own profile.
 *
 * FEATURES:
 * - CompanyProfileCard: stats grid (roster size, rating, insurance, coverage)
 * - MeetTheTeam: team preview showing up to 6 active medics
 * - CompanyRatingsSummary: reviews and ratings distribution
 * - isOwnProfile detection for "Manage Roster" link
 * - Loading skeletons and "Company not found" state
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCompanyProfile } from '@/lib/queries/marketplace/roster';
import { formatCompanyProfile } from '@/lib/marketplace/company-profile';
import { CompanyProfileCard } from '@/components/marketplace/roster/CompanyProfileCard';
import { MeetTheTeam } from '@/components/marketplace/roster/MeetTheTeam';
import { CompanyRatingsSummary } from '@/components/marketplace/ratings/CompanyRatingsSummary';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

// =============================================================================
// Component
// =============================================================================

export default function CompanyProfilePage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  // Determine if this is the current user's own company profile
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const checkOwnProfile = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: company } = await supabase
          .from('marketplace_companies')
          .select('id')
          .eq('admin_user_id', user.id)
          .eq('id', companyId)
          .single();

        if (company) {
          setIsOwnProfile(true);
        }
      } catch {
        // Not own profile or error -- leave as false
      }
    };

    checkOwnProfile();
  }, [companyId]);

  // Fetch company profile via React Query
  const { data, isLoading, error } = useCompanyProfile(companyId);

  // ==========================================================================
  // Loading State
  // ==========================================================================
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile card skeleton */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        {/* Team skeleton */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Error / Not Found State
  // ==========================================================================
  if (error || !data?.profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-16">
            <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Company not found
            </h2>
            <p className="text-sm text-gray-500">
              This company profile does not exist or you do not have access to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================================================
  // Format profile data
  // ==========================================================================
  const company = formatCompanyProfile(data.profile);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Company Profile Card (stats, description, badges) */}
      <CompanyProfileCard company={company} />

      {/* 2. Meet the Team section */}
      <MeetTheTeam
        teamPreview={company.team_preview}
        companyId={company.id}
        isOwnProfile={isOwnProfile}
        rosterSize={company.roster_size}
      />

      {/* 3. Ratings Summary */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reviews</h2>
          <CompanyRatingsSummary
            companyId={company.id}
            averageRating={company.average_rating}
            reviewCount={company.review_count}
          />
        </CardContent>
      </Card>
    </div>
  );
}
