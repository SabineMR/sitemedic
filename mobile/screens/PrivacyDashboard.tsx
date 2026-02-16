/**
 * PrivacyDashboard.tsx
 *
 * GDPR-compliant privacy dashboard for medics.
 *
 * WHY: GDPR requires providing users with:
 * - Visibility into what data we collect
 * - Easy access to export their data (Right to Access)
 * - Easy way to delete their data (Right to be Forgotten)
 * - Consent management
 *
 * SHOWS:
 * - Current consent status
 * - Data volumes (pings, events, audit logs)
 * - Data age (oldest/newest ping)
 * - Who viewed your location data
 * - Export/deletion history
 * - Actions: Export Data, Delete Data, Withdraw Consent
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface PrivacyDashboard {
  medic_id: string;
  medic_name: string;
  consent_status: 'active' | 'withdrawn' | 'none';
  consent_given_at?: string;
  withdrawn_at?: string;
  total_pings_stored: number;
  total_events_stored: number;
  total_audit_logs: number;
  oldest_ping?: string;
  newest_ping?: string;
  times_viewed_by_admin: number;
  last_viewed_by_admin?: string;
  times_exported: number;
  last_exported_at?: string;
  data_deleted_previously: boolean;
}

export default function PrivacyDashboardScreen() {
  const [dashboard, setDashboard] = useState<PrivacyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  /**
   * Load privacy dashboard data
   */
  const loadDashboard = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('medic_privacy_dashboard')
        .select('*')
        .eq('medic_id', user.id)
        .single();

      if (error) throw error;

      setDashboard(data);
    } catch (error) {
      console.error('Error loading privacy dashboard:', error);
      Alert.alert('Error', 'Failed to load privacy dashboard');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export all data (GDPR Right to Access)
   */
  const handleExportData = async () => {
    Alert.alert(
      'Export Your Data',
      'This will export all your location tracking data as a JSON file. This may take a minute.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              setExporting(true);

              const { data, error } = await supabase.functions.invoke(
                'gdpr-export-data',
                {
                  method: 'POST',
                }
              );

              if (error) throw error;

              // Share the exported data
              const exportJson = JSON.stringify(data, null, 2);
              await Share.share({
                message: exportJson,
                title: 'SiteMedic Data Export',
              });

              Alert.alert(
                'Export Complete',
                `Exported ${data.data.location_pings?.length || 0} location pings and ${data.data.shift_events?.length || 0} shift events`
              );

              // Reload dashboard to update export count
              await loadDashboard();
            } catch (error) {
              console.error('Export error:', error);
              Alert.alert('Export Failed', 'Failed to export your data');
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Delete all data (GDPR Right to be Forgotten)
   */
  const handleDeleteData = async () => {
    Alert.alert(
      '⚠️ Delete All Data',
      'This will PERMANENTLY delete:\n\n' +
        `• ${dashboard?.total_pings_stored || 0} location pings\n` +
        `• ${dashboard?.total_events_stored || 0} shift events\n` +
        `• ${dashboard?.total_audit_logs || 0} audit logs\n\n` +
        'Audit logs will be kept for 6 years (UK legal requirement).\n\n' +
        'This action CANNOT be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);

              const { data, error } = await supabase.functions.invoke(
                'gdpr-delete-data',
                {
                  method: 'POST',
                  body: {
                    confirmation: true,
                    reason: 'User requested deletion via mobile app',
                  },
                }
              );

              if (error) throw error;

              Alert.alert(
                'Data Deleted',
                'All your location tracking data has been permanently deleted.\n\n' +
                  'Audit logs are retained for 6 years per UK law.\n\n' +
                  'Location tracking has been disabled.',
                [{ text: 'OK', onPress: () => loadDashboard() }]
              );
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Delete Failed', 'Failed to delete your data');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Withdraw consent (stops location tracking)
   */
  const handleWithdrawConsent = async () => {
    Alert.alert(
      'Withdraw Consent',
      'This will:\n\n' +
        '• Stop location tracking immediately\n' +
        '• Prevent new data collection\n' +
        '• Keep existing data (export/delete separately)\n\n' +
        'You can re-consent later if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw Consent',
          style: 'destructive',
          onPress: async () => {
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) throw new Error('Not authenticated');

              const { error } = await supabase
                .from('medic_location_consent')
                .update({ withdrawn_at: new Date().toISOString() })
                .eq('medic_id', user.id)
                .is('withdrawn_at', null);

              if (error) throw error;

              Alert.alert(
                'Consent Withdrawn',
                'Location tracking has been disabled. Your existing data is still stored.',
                [{ text: 'OK', onPress: () => loadDashboard() }]
              );
            } catch (error) {
              console.error('Withdraw consent error:', error);
              Alert.alert('Error', 'Failed to withdraw consent');
            }
          },
        },
      ]
    );
  };

  /**
   * Format date/time
   */
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Never';
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Get consent status color
   */
  const getConsentColor = () => {
    switch (dashboard?.consent_status) {
      case 'active':
        return styles.statusActive;
      case 'withdrawn':
        return styles.statusWithdrawn;
      case 'none':
        return styles.statusNone;
      default:
        return styles.statusNone;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading privacy dashboard...</Text>
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load privacy dashboard</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Privacy & Data</Text>
        <Text style={styles.subtitle}>Manage your location tracking data</Text>
      </View>

      {/* Consent Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Consent Status</Text>
        <View style={[styles.statusBadge, getConsentColor()]}>
          <Text style={styles.statusText}>
            {dashboard.consent_status === 'active' && '✓ Active'}
            {dashboard.consent_status === 'withdrawn' && '⊗ Withdrawn'}
            {dashboard.consent_status === 'none' && '⊘ Not Given'}
          </Text>
        </View>
        {dashboard.consent_given_at && (
          <Text style={styles.detailText}>
            Given on: {formatDate(dashboard.consent_given_at)}
          </Text>
        )}
        {dashboard.withdrawn_at && (
          <Text style={styles.detailText}>
            Withdrawn on: {formatDate(dashboard.withdrawn_at)}
          </Text>
        )}
      </View>

      {/* Data Volumes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Stored</Text>
        <View style={styles.statsGrid}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dashboard.total_pings_stored}</Text>
            <Text style={styles.statLabel}>Location Pings</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dashboard.total_events_stored}</Text>
            <Text style={styles.statLabel}>Shift Events</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dashboard.total_audit_logs}</Text>
            <Text style={styles.statLabel}>Audit Logs</Text>
          </View>
        </View>
        {dashboard.oldest_ping && (
          <Text style={styles.detailText}>
            Oldest data: {formatDate(dashboard.oldest_ping)}
          </Text>
        )}
        {dashboard.newest_ping && (
          <Text style={styles.detailText}>
            Newest data: {formatDate(dashboard.newest_ping)}
          </Text>
        )}
      </View>

      {/* Data Access */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Who Viewed Your Data</Text>
        <Text style={styles.detailText}>
          Viewed by admin: {dashboard.times_viewed_by_admin} times
        </Text>
        {dashboard.last_viewed_by_admin && (
          <Text style={styles.detailText}>
            Last viewed: {formatDate(dashboard.last_viewed_by_admin)}
          </Text>
        )}
      </View>

      {/* Export History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export History</Text>
        <Text style={styles.detailText}>
          Exported: {dashboard.times_exported} times
        </Text>
        {dashboard.last_exported_at && (
          <Text style={styles.detailText}>
            Last export: {formatDate(dashboard.last_exported_at)}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rights</Text>

        {/* Export Data */}
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleExportData}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>📦 Export My Data</Text>
          )}
        </TouchableOpacity>

        {/* Withdraw Consent */}
        {dashboard.consent_status === 'active' && (
          <TouchableOpacity
            style={[styles.button, styles.buttonWarning]}
            onPress={handleWithdrawConsent}
          >
            <Text style={styles.buttonText}>⊗ Withdraw Consent</Text>
          </TouchableOpacity>
        )}

        {/* Delete Data */}
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleDeleteData}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>🗑️ Delete All My Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* GDPR Notice */}
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Your Privacy Rights</Text>
        <Text style={styles.noticeText}>
          • Right to Access: Export all your data{'\n'}
          • Right to be Forgotten: Delete all your data{'\n'}
          • Right to Withdraw Consent: Stop data collection{'\n'}
          {'\n'}
          Location pings retained for 30 days.{'\n'}
          Audit logs retained for 6 years (UK legal requirement).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusWithdrawn: {
    backgroundColor: '#FEE2E2',
  },
  statusNone: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',
  },
  buttonWarning: {
    backgroundColor: '#F59E0B',
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notice: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 20,
  },
});
