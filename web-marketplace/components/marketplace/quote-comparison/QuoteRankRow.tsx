/**
 * Expandable Quote Rank Row
 * Phase 34: Quote Submission & Comparison — Plan 02
 *
 * Displays a single quote in the ranked list. Collapsed state shows key
 * info (rank, company, price, rating, qualifications, response time).
 * Expanded state reveals full pricing breakdown, staffing plan, cover
 * letter, and link to company profile.
 *
 * Checkatrade/Bark pattern: click row to expand details.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Star, Clock, ExternalLink, ShieldCheck, Award } from 'lucide-react';
import { anonymiseQuoteForDisplay, maskName } from '@/lib/anonymization/quote-anonymizer';
import { STAFFING_ROLE_LABELS, type EventStatus } from '@/lib/marketplace/event-types';
import type { MarketplaceQuoteWithCompany, StaffingPlan, PricingBreakdown } from '@/lib/marketplace/quote-types';

// =============================================================================
// Types
// =============================================================================

interface QuoteRankRowProps {
  quote: MarketplaceQuoteWithCompany;
  rank: number;
  bestValueScore: number;
  eventStatus: EventStatus;
  isDepositPaid: boolean;
  isAuthor: boolean;
  onAward?: (quoteId: string) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatResponseTime(submittedAt: string | null, eventCreatedAt?: string): string {
  if (!submittedAt) return 'Pending';
  const submitted = new Date(submittedAt).getTime();
  const now = Date.now();
  const diffMs = now - submitted;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

function getQualificationSummary(staffingPlan: StaffingPlan): string {
  if (staffingPlan.type === 'named_medics' && staffingPlan.named_medics) {
    const counts: Record<string, number> = {};
    staffingPlan.named_medics.forEach((m) => {
      const label = STAFFING_ROLE_LABELS[m.qualification] || m.qualification;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([role, count]) => `${count}x ${role}`)
      .join(', ');
  }

  if (staffingPlan.type === 'headcount_and_quals' && staffingPlan.headcount_plans) {
    return staffingPlan.headcount_plans
      .map((h) => `${h.quantity}x ${STAFFING_ROLE_LABELS[h.role] || h.role}`)
      .join(', ');
  }

  return 'Not specified';
}

function renderStars(rating: number): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= Math.round(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function QuoteRankRow({
  quote,
  rank,
  bestValueScore,
  eventStatus,
  isDepositPaid,
  isAuthor,
  onAward,
}: QuoteRankRowProps) {
  const [expanded, setExpanded] = useState(false);

  // Apply anonymisation
  const displayQuote = anonymiseQuoteForDisplay(
    {
      company_name: quote.company_name,
      company_phone: undefined, // Not in MarketplaceQuoteWithCompany
      company_email: undefined,
      company_address: undefined,
      medic_names:
        quote.staffing_plan.type === 'named_medics'
          ? (quote.staffing_plan.named_medics ?? []).map((m) => m.name)
          : [],
    },
    eventStatus,
    isDepositPaid,
    isAuthor
  );

  const pricing: PricingBreakdown = quote.pricing_breakdown;

  return (
    <Card
      className={`overflow-hidden transition-shadow ${
        expanded ? 'shadow-md ring-1 ring-blue-100' : 'hover:shadow-sm'
      }`}
    >
      {/* Collapsed Row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        {/* Rank badge */}
        <span
          className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
            rank === 1
              ? 'bg-yellow-100 text-yellow-700'
              : rank === 2
                ? 'bg-gray-100 text-gray-600'
                : rank === 3
                  ? 'bg-orange-50 text-orange-600'
                  : 'bg-gray-50 text-gray-500'
          }`}
        >
          #{rank}
        </span>

        {/* Company name and rating */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 truncate">
              {displayQuote.company_name}
            </span>
            {quote.company_verification_status === 'verified' && (
              <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
            )}
            {quote.status === 'revised' && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                Revised
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              {renderStars(quote.company_rating)}
              <span className="text-xs">({quote.company_review_count})</span>
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="hidden sm:inline text-xs">
              {getQualificationSummary(quote.staffing_plan)}
            </span>
          </div>
        </div>

        {/* Score indicator */}
        <div className="hidden md:flex flex-col items-center text-xs text-gray-400">
          <span className="font-semibold text-sm text-blue-600">{bestValueScore}</span>
          <span>score</span>
        </div>

        {/* Response time */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {formatResponseTime(quote.submitted_at)}
        </div>

        {/* Price */}
        <span className="text-lg font-bold text-gray-900 flex-shrink-0">
          {formatCurrency(quote.total_price)}
        </span>

        {/* Expand/collapse icon */}
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4 bg-gray-50/50">
          {/* Pricing Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Pricing Breakdown</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-1.5 text-gray-600">Staff</td>
                  <td className="py-1.5 text-right font-medium">
                    {formatCurrency(pricing.staff_cost)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Equipment</td>
                  <td className="py-1.5 text-right font-medium">
                    {formatCurrency(pricing.equipment_cost)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Transport</td>
                  <td className="py-1.5 text-right font-medium">
                    {formatCurrency(pricing.transport_cost)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Consumables</td>
                  <td className="py-1.5 text-right font-medium">
                    {formatCurrency(pricing.consumables_cost)}
                  </td>
                </tr>
                {pricing.custom_line_items?.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1.5 text-gray-600">
                      {item.label}
                      {item.quantity > 1 && (
                        <span className="text-gray-400 ml-1">x{item.quantity}</span>
                      )}
                      {item.notes && (
                        <span className="text-gray-400 text-xs ml-1">({item.notes})</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-medium">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200">
                  <td className="py-2 font-semibold text-gray-900">Total</td>
                  <td className="py-2 text-right font-bold text-gray-900">
                    {formatCurrency(quote.total_price)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Staffing Plan */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Staffing Plan</h4>
            {quote.staffing_plan.type === 'named_medics' && quote.staffing_plan.named_medics ? (
              <ul className="space-y-1">
                {quote.staffing_plan.named_medics.map((medic, idx) => {
                  const displayName = isAuthor || (eventStatus === 'awarded' && isDepositPaid)
                    ? medic.name
                    : maskName(medic.name);
                  return (
                    <li key={medic.medic_id || idx} className="text-sm flex items-center gap-2">
                      <span className="text-gray-700">{displayName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {STAFFING_ROLE_LABELS[medic.qualification] || medic.qualification}
                      </Badge>
                      {medic.notes && (
                        <span className="text-xs text-gray-400">{medic.notes}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : quote.staffing_plan.type === 'headcount_and_quals' && quote.staffing_plan.headcount_plans ? (
              <ul className="space-y-1">
                {quote.staffing_plan.headcount_plans.map((plan, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    {plan.quantity}x {STAFFING_ROLE_LABELS[plan.role] || plan.role}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No staffing details provided.</p>
            )}
          </div>

          {/* Cover Letter */}
          {quote.cover_letter && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Cover Letter</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {quote.cover_letter.length > 500
                  ? `${quote.cover_letter.slice(0, 500)}...`
                  : quote.cover_letter}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t">
            <Link href={`/marketplace/companies/${quote.company_id}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                View Company Profile
              </Button>
            </Link>
            {onAward &&
              (eventStatus === 'open' || eventStatus === 'closed') &&
              (quote.status === 'submitted' || quote.status === 'revised') && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAward(quote.id);
                  }}
                >
                  <Award className="h-3.5 w-3.5" />
                  Award This Quote
                </Button>
              )}
            {quote.status === 'awarded' && (
              <Badge className="bg-green-100 text-green-700">Awarded</Badge>
            )}
            {quote.status === 'rejected' && (
              <Badge variant="secondary" className="text-slate-600">Not Selected</Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
