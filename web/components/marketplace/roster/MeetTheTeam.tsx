/**
 * MeetTheTeam Component
 * Phase 37: Company Accounts -- Plan 03
 *
 * Team preview section showing active roster medics on the company profile.
 * Displays up to 6 medics with name, qualification, title, and availability.
 *
 * Features:
 *   - Grid layout: 1 col mobile, 2 cols md, 3 cols lg
 *   - Qualification badges for each medic
 *   - "Temporarily unavailable" amber badge for unavailable medics
 *   - "Manage Roster" link for company admin (isOwnProfile)
 *   - "+X more" text when roster exceeds 6 members
 */

'use client';

import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';
import type { StaffingRole } from '@/lib/marketplace/event-types';
import type { TeamMemberPreview } from '@/lib/marketplace/roster-types';

// =============================================================================
// Types
// =============================================================================

interface MeetTheTeamProps {
  teamPreview: TeamMemberPreview[];
  companyId: string;
  isOwnProfile: boolean;
  rosterSize: number;
}

// =============================================================================
// Component
// =============================================================================

export function MeetTheTeam({
  teamPreview,
  companyId,
  isOwnProfile,
  rosterSize,
}: MeetTheTeamProps) {
  // Show up to 6 members in the preview
  const displayedMembers = teamPreview.slice(0, 6);
  const remainingCount = rosterSize - displayedMembers.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Meet the Team
          </CardTitle>
          {isOwnProfile && (
            <Link
              href="/dashboard/marketplace/roster"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Manage Roster
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {displayedMembers.length === 0 ? (
          /* Empty State */
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No team members listed yet</p>
          </div>
        ) : (
          <>
            {/* Team Grid: 1 col mobile, 2 cols md, 3 cols lg */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedMembers.map((member) => (
                <div
                  key={member.medic_id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Name */}
                  <p className="font-semibold text-gray-900">{member.name}</p>

                  {/* Title */}
                  {member.title && (
                    <p className="text-sm text-gray-600 mt-0.5">{member.title}</p>
                  )}

                  {/* Qualification Badge */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.qualification && (
                      <Badge variant="secondary" className="text-xs">
                        {STAFFING_ROLE_LABELS[member.qualification as StaffingRole] ??
                          member.qualification}
                      </Badge>
                    )}
                  </div>

                  {/* Availability Indicator */}
                  {!member.available && (
                    <Badge
                      className="mt-2 bg-amber-100 text-amber-800 border-amber-200 border"
                      variant="outline"
                    >
                      Temporarily unavailable
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* "+X more" text */}
            {remainingCount > 0 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                +{remainingCount} more team member{remainingCount !== 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
