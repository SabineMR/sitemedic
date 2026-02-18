/**
 * Events Screen (Admin only)
 *
 * Lists upcoming bookings for admin users, queried via Supabase RLS
 * so admins only see their own organisation's events.
 *
 * Status badges:
 *   pending     → amber
 *   confirmed   → green
 *   in_progress → blue
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRole } from '../../hooks/useRole';

interface BookingEvent {
  id: string;
  site_name: string;
  shift_date: string;
  shift_start_time: string | null;
  shift_end_time: string | null;
  status: 'pending' | 'confirmed' | 'in_progress';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m}${suffix}`;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  confirmed:   { bg: '#D1FAE5', text: '#065F46', label: 'Confirmed' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF', label: 'In Progress' },
};

export default function EventsScreen() {
  const { isAdmin } = useRole();
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { supabase } = await import('../../src/lib/supabase');
      const { data, error: err } = await supabase
        .from('bookings')
        .select('id, site_name, shift_date, shift_start_time, shift_end_time, status')
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .order('shift_date', { ascending: true })
        .limit(50);
      if (err) throw err;
      setEvents((data as BookingEvent[]) ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load events.');
    }
  }, []);

  useEffect(() => {
    fetchEvents().finally(() => setLoading(false));
  }, [fetchEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Upcoming Events</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 48 }} />
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyText}>Could not load events.</Text>
            <Text style={styles.emptySubtext}>{error}</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No upcoming events.</Text>
            <Text style={styles.emptySubtext}>
              Book through the web portal to see events here.
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Events ({events.length})</Text>
            <View style={styles.card}>
              {events.map((event, index) => {
                const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.pending;
                return (
                  <View key={event.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <View style={styles.eventRow}>
                      <View style={styles.eventInfo}>
                        <Text style={styles.siteName}>{event.site_name}</Text>
                        <Text style={styles.eventDate}>{formatDate(event.shift_date)}</Text>
                        <Text style={styles.eventTime}>
                          {formatTime(event.shift_start_time)} – {formatTime(event.shift_end_time)}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
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
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  eventInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 13,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
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
