/**
 * Team Screen (Admin only)
 *
 * Shows the roster of team members in the admin's organisation.
 * Fetched from the `profiles` table filtered by org_id via Supabase RLS.
 * The admin's own entry is shown at the top as "You".
 *
 * Role badges: Medic / Site Manager / Admin
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
  full_name: string | null;
  email: string | null;
  role: 'medic' | 'site_manager' | 'admin';
}

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  medic:        { bg: '#DBEAFE', text: '#1E40AF', label: 'Medic' },
  site_manager: { bg: '#F3E8FF', text: '#6B21A8', label: 'Site Manager' },
  admin:        { bg: '#FEF3C7', text: '#92400E', label: 'Admin' },
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
        let query = supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('org_id', orgId)
          .order('full_name', { ascending: true });
        if (userId) {
          query = query.neq('id', userId);
        }
        const { data, error: err } = await query;
        if (err) throw err;
        setMembers((data as TeamMember[]) ?? []);
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
                <View style={[styles.roleBadge, { backgroundColor: ROLE_BADGE.admin.bg }]}>
                  <Text style={[styles.roleText, { color: ROLE_BADGE.admin.text }]}>
                    {ROLE_BADGE.admin.label}
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
                          <Text style={styles.memberName}>
                            {member.full_name || 'Unnamed'}
                          </Text>
                          {member.email ? (
                            <Text style={styles.memberEmail}>{member.email}</Text>
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
