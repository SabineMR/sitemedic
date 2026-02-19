/**
 * Team Screen (Admin only)
 *
 * Shows the roster of team members in the admin's organisation.
 * Queries both `profiles` (auth-linked users) and `medics` (medic roster)
 * tables in parallel, deduplicates by auth user ID, and merges results.
 * The admin's own entry is shown at the top as "You".
 *
 * Role badges: Medic / Site Manager / Admin
 * Medic rows show an availability dot (green/gray) and classification subtitle.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRole } from '../../hooks/useRole';

interface TeamMember {
  id: string;
  authUserId: string | null;
  full_name: string | null;
  email: string | null;
  role: 'medic' | 'site_manager' | 'admin' | 'org_admin' | 'platform_admin';
  source: 'profiles' | 'medics';
  available_for_work?: boolean;
  classification?: string | null;
}

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  medic:          { bg: '#DBEAFE', text: '#1E40AF', label: 'Medic' },
  site_manager:   { bg: '#F3E8FF', text: '#6B21A8', label: 'Site Manager' },
  admin:          { bg: '#FEF3C7', text: '#92400E', label: 'Admin' },
  org_admin:      { bg: '#FEF3C7', text: '#92400E', label: 'Org Admin' },
  platform_admin: { bg: '#FEE2E2', text: '#991B1B', label: 'Platform Admin' },
};

export default function TeamScreen() {
  const { state } = useAuth();
  const { isAdmin } = useRole();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const orgId = state.user?.orgId;
      const userId = state.user?.id;
      if (!orgId) {
        setLoading(false);
        return;
      }
      try {
        const { supabase } = await import('../../src/lib/supabase');

        // Query profiles (auth-linked users) and medics (roster) in parallel
        let profilesQuery = supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('org_id', orgId)
          .order('full_name', { ascending: true });
        if (userId) {
          profilesQuery = profilesQuery.neq('id', userId);
        }

        const medicsQuery = supabase
          .from('medics')
          .select('id, user_id, first_name, last_name, email, available_for_work, classification')
          .eq('org_id', orgId);

        const [profilesResult, medicsResult] = await Promise.all([profilesQuery, medicsQuery]);
        if (profilesResult.error) throw profilesResult.error;
        if (medicsResult.error) throw medicsResult.error;

        // Map profiles to TeamMember format
        const profileMembers: TeamMember[] = (profilesResult.data ?? []).map((p: any) => ({
          id: p.id,
          authUserId: p.id,
          full_name: p.full_name,
          email: p.email,
          role: p.role,
          source: 'profiles' as const,
        }));

        // Build set of auth user IDs already represented (profiles + current user)
        const knownAuthIds = new Set<string>(profileMembers.map((m) => m.authUserId!));
        if (userId) knownAuthIds.add(userId);

        // Map medics to TeamMember format, excluding those already in profiles
        const medicMembers: TeamMember[] = (medicsResult.data ?? [])
          .filter((m: any) => !m.user_id || !knownAuthIds.has(m.user_id))
          .map((m: any) => ({
            id: `medic-${m.id}`,
            authUserId: m.user_id ?? null,
            full_name: [m.first_name, m.last_name].filter(Boolean).join(' ') || null,
            email: m.email,
            role: 'medic' as const,
            source: 'medics' as const,
            available_for_work: m.available_for_work ?? false,
            classification: m.classification ?? null,
          }));

        // Combine and sort alphabetically by name
        const combined = [...profileMembers, ...medicMembers].sort((a, b) =>
          (a.full_name ?? '').localeCompare(b.full_name ?? '')
        );

        setMembers(combined);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load team.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [state.user?.orgId, state.user?.id]);

  if (!isAdmin) {
    return (
      <View style={styles.restricted}>
        <Text style={styles.restrictedIcon}>🔒</Text>
        <Text style={styles.restrictedTitle}>Access Restricted</Text>
        <Text style={styles.restrictedSubtext}>
          This area is for administrators only.
        </Text>
      </View>
    );
  }

  const totalCount = members.length + 1; // +1 for "You"

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Team</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 48 }} />
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyText}>Could not load team.</Text>
            <Text style={styles.emptySubtext}>{error}</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Your Team ({totalCount})
            </Text>
            <View style={styles.card}>
              {/* "You" row — always shown at top */}
              <View style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>
                      {state.user?.fullName || 'You'}
                    </Text>
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  </View>
                  {state.user?.email ? (
                    <Text style={styles.memberEmail}>{state.user.email}</Text>
                  ) : null}
                </View>
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_BADGE[state.user?.role ?? 'admin'] ?? ROLE_BADGE.admin).bg }]}>
                  <Text style={[styles.roleText, { color: (ROLE_BADGE[state.user?.role ?? 'admin'] ?? ROLE_BADGE.admin).text }]}>
                    {(ROLE_BADGE[state.user?.role ?? 'admin'] ?? ROLE_BADGE.admin).label}
                  </Text>
                </View>
              </View>

              {members.length === 0 ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.emptyTeam}>
                    <Text style={styles.emptyTeamText}>No other team members yet.</Text>
                    <Text style={styles.emptyTeamSubtext}>
                      Invite medics and site managers to join your organisation.
                    </Text>
                  </View>
                </>
              ) : (
                members.map((member) => {
                  const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.medic;
                  return (
                    <View key={member.id}>
                      <View style={styles.divider} />
                      <View style={styles.memberRow}>
                        <View style={styles.memberInfo}>
                          <View style={styles.nameRow}>
                            {member.source === 'medics' && (
                              <View
                                style={[
                                  styles.availabilityDot,
                                  {
                                    backgroundColor: member.available_for_work
                                      ? '#10B981'
                                      : '#9CA3AF',
                                  },
                                ]}
                              />
                            )}
                            <Text style={styles.memberName}>
                              {member.full_name || 'Unnamed'}
                            </Text>
                          </View>
                          {member.email ? (
                            <Text style={styles.memberEmail}>{member.email}</Text>
                          ) : null}
                          {member.source === 'medics' && member.classification ? (
                            <Text style={styles.classificationText}>
                              {member.classification}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.roleText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  youBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  memberEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  classificationText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTeam: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyTeamText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptyTeamSubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  restricted: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  restrictedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  restrictedSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
