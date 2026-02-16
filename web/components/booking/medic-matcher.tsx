/**
 * Medic Matcher Component
 * Phase 4.5: Display auto-matched medic candidates with transparency
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MapPin, Clock, TrendingUp, Info } from 'lucide-react';

interface MatchCandidate {
  medic_id: string;
  medic_name: string;
  star_rating: number;
  distance_miles?: number;
  travel_time_minutes?: number;
  availability: string;
  match_score: number;
  match_reasons: string[];
}

interface MedicMatcherProps {
  matches: MatchCandidate[];
  requiresManualApproval?: boolean;
  reason?: string;
}

export function MedicMatcher({
  matches,
  requiresManualApproval = false,
  reason,
}: MedicMatcherProps) {
  // Manual approval case (no matches or low confidence)
  if (requiresManualApproval || matches.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Manual Review Required
                </h3>
                <p className="text-sm text-blue-700">
                  {reason || 'No medics available for automatic assignment. Our team will review your booking and assign a medic within 2 hours.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* How We Match Info Box */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-slate-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">
                How We Match Medics
              </h3>
              <p className="text-sm text-slate-600">
                Our algorithm considers distance, availability, rating, qualifications, and fair shift distribution to find the best medic for your site.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matched Medics */}
      {matches.map((match, index) => {
        const isTopMatch = index === 0;

        return (
          <Card
            key={match.medic_id}
            className={`${
              isTopMatch
                ? 'border-2 border-blue-600 shadow-lg'
                : 'border-slate-200'
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">
                    {match.medic_name}
                    {isTopMatch && (
                      <Badge className="ml-2 bg-blue-600 text-white">
                        Assigned
                      </Badge>
                    )}
                  </CardTitle>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {/* Star Rating */}
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{match.star_rating.toFixed(1)}</span>
                      <span className="text-slate-500">/ 5.0</span>
                    </div>

                    {/* Distance */}
                    {match.distance_miles !== undefined && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{match.distance_miles} miles away</span>
                      </div>
                    )}

                    {/* Travel Time */}
                    {match.travel_time_minutes !== undefined && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{match.travel_time_minutes} min travel</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {/* Availability Badge */}
                  <Badge
                    variant={
                      match.availability === 'Available' ? 'default' : 'secondary'
                    }
                    className={
                      match.availability === 'Available'
                        ? 'bg-green-600'
                        : 'bg-yellow-600'
                    }
                  >
                    {match.availability}
                  </Badge>

                  {/* Match Score Badge */}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {match.match_score.toFixed(0)}% match
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Match Reasons */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                  Why this medic?
                </h4>
                <ul className="space-y-1">
                  {match.match_reasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
