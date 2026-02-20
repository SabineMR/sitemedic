/**
 * Quote Detail Modal
 * Phase 34: Quote Submission & Comparison — Plan 02
 *
 * Full-screen modal for viewing complete quote details and company profile.
 * Shows all pricing, staffing, cover letter, and company information.
 * Contact details section respects anonymisation rules.
 */

'use client';

import { useQuoteDetail } from '@/lib/queries/marketplace/quotes';
import { canViewContactDetails, maskName } from '@/lib/anonymization/quote-anonymizer';
import { STAFFING_ROLE_LABELS, type EventStatus } from '@/lib/marketplace/event-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, ShieldX, Star, Phone, Mail, MapPin, Lock } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface QuoteDetailModalProps {
  quoteId: string | undefined;
  open: boolean;
  onClose: () => void;
  eventStatus: EventStatus;
  isDepositPaid: boolean;
  currentUserId: string;
  eventPosterId: string;
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

// =============================================================================
// Component
// =============================================================================

export default function QuoteDetailModal({
  quoteId,
  open,
  onClose,
  eventStatus,
  isDepositPaid,
  currentUserId,
  eventPosterId,
}: QuoteDetailModalProps) {
  const { data, isLoading } = useQuoteDetail(open ? quoteId : undefined);
  const quote = data?.quote;
  const company = data?.company;

  const showContactDetails = company
    ? canViewContactDetails(
        eventStatus,
        isDepositPaid,
        currentUserId,
        eventPosterId,
        quote?.company_id || ''
      )
    : false;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isLoading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              quote?.company_name || 'Quote Details'
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : quote && company ? (
          <div className="space-y-6">
            {/* Company Overview */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Company Profile</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{company.company_name}</span>
                  {company.verification_status === 'verified' ? (
                    <Badge variant="secondary" className="gap-1 text-xs text-green-700">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs text-gray-500">
                      <ShieldX className="h-3 w-3" />
                      {company.verification_status}
                    </Badge>
                  )}
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${
                          n <= Math.round(company.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </span>
                  <span className="text-sm text-gray-500">
                    {company.rating.toFixed(1)} ({company.review_count} review
                    {company.review_count !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Certifications */}
                {company.certifications && company.certifications.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Certifications:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {company.certifications.map((cert: string) => (
                        <Badge key={cert} variant="secondary" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insurance */}
                <div className="flex items-center gap-4 text-sm">
                  {company.insurance_provider ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <ShieldCheck className="h-4 w-4" />
                      Insured ({company.insurance_provider})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400">
                      <ShieldX className="h-4 w-4" />
                      Insurance not provided
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Contact Details */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Contact Details</h3>
              {showContactDetails ? (
                <div className="space-y-1.5 text-sm">
                  {company.company_phone && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {company.company_phone}
                    </div>
                  )}
                  {company.company_email && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {company.company_email}
                    </div>
                  )}
                  {company.company_address && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {company.company_address}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <Lock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Contact details will be available after the event is awarded and the deposit has
                    been paid.
                  </p>
                </div>
              )}
            </section>

            {/* Reviews placeholder */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Reviews</h3>
              <p className="text-sm text-gray-400 italic">
                Reviews will be available in a future update.
              </p>
            </section>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Quote details not available.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
