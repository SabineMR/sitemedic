/**
 * CompanyProfileCard Component
 * Phase 37: Company Accounts -- Plan 03
 * Enhanced: Phase 36 Extension — Features 1, 9, 10
 *
 * Company header card displaying key metrics:
 *   - Company name with verified badge
 *   - Company description
 *   - Stats grid: Team Size, Rating (2 decimal), Trust Score, Insurance, Coverage
 *   - "New" badge for companies with < 3 reviews (Feature 10)
 *   - Trust Score display (Feature 9)
 *   - Member since date
 */

'use client';

import { Star, Users, Shield, MapPin, Calendar, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import { getInsuranceBadgeColor, formatMemberSince, hasEnoughReviews } from '@/lib/marketplace/company-profile';
import { getTrustScoreLabel, getTrustScoreColor } from '@/lib/marketplace/trust-score';
import { INSURANCE_STATUS_LABELS } from '@/lib/marketplace/roster-types';
import type { CompanyProfileDisplay } from '@/lib/marketplace/roster-types';
import type { VerificationStatus } from '@/lib/marketplace/types';

// =============================================================================
// Types
// =============================================================================

interface CompanyProfileCardProps {
  company: CompanyProfileDisplay;
}

// =============================================================================
// Component
// =============================================================================

export function CompanyProfileCard({ company }: CompanyProfileCardProps) {
  const insuranceColors = getInsuranceBadgeColor(company.insurance_status);
  const showNumericRating = hasEnoughReviews(company.review_count);
  const trustScoreLabel = getTrustScoreLabel(company.trust_score);
  const trustScoreColor = getTrustScoreColor(company.trust_score);

  return (
    <Card>
      <CardHeader>
        {/* Company Name + Verified Badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">
            {company.company_name}
          </h1>
          {(company.verification_status === 'verified' ||
            company.verification_status === 'cqc_verified') && (
            <VerifiedBadge
              status={company.verification_status as VerificationStatus}
              size="md"
            />
          )}
        </div>

        {/* Description */}
        {company.company_description && (
          <p className="text-gray-600 mt-2 leading-relaxed">
            {company.company_description}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Stats Grid: 2 cols mobile, 6 cols md+ */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {/* Team Size */}
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <Users className="h-5 w-5 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {company.roster_size}
            </p>
            <p className="text-xs text-gray-500 mt-1">Team Size</p>
          </div>

          {/* Rating (Feature 1: 2 decimal, Feature 10: New badge) */}
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400 mx-auto mb-2" />
            {showNumericRating ? (
              <p className="text-2xl font-bold text-gray-900">
                {company.average_rating > 0
                  ? company.average_rating.toFixed(2)
                  : '--'}
              </p>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                <Sparkles className="h-3 w-3 mr-0.5 inline" />
                New
              </Badge>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Rating{company.review_count > 0 && ` (${company.review_count})`}
            </p>
          </div>

          {/* Trust Score (Feature 9) */}
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <ShieldCheck className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {company.trust_score}
            </p>
            <Badge className={`${trustScoreColor.bg} ${trustScoreColor.text} text-[10px] mt-1`}>
              {trustScoreLabel}
            </Badge>
            <p className="text-xs text-gray-500 mt-1">Trust Score</p>
          </div>

          {/* Events Completed */}
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {company.total_events_completed}
            </p>
            <p className="text-xs text-gray-500 mt-1">Events Completed</p>
          </div>

          {/* Insurance */}
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <Shield className="h-5 w-5 text-gray-600 mx-auto mb-2" />
            <Badge
              className={`${insuranceColors.bg} ${insuranceColors.text} ${insuranceColors.border} border`}
              variant="outline"
            >
              {INSURANCE_STATUS_LABELS[company.insurance_status]}
            </Badge>
            <p className="text-xs text-gray-500 mt-2">Insurance</p>
          </div>

          {/* Coverage */}
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <MapPin className="h-5 w-5 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 truncate">
              {company.coverage_areas && company.coverage_areas.length > 0
                ? company.coverage_areas.join(', ')
                : 'Not specified'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Coverage</p>
          </div>
        </div>

        {/* Member Since */}
        <div className="flex items-center gap-2 mt-6 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>Member since {formatMemberSince(company.created_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
