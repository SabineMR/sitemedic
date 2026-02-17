/**
 * Settings Screen
 *
 * User preferences and account settings.
 * Implements AUTH-03 requirement (biometric authentication toggle).
 *
 * Features:
 * - Biometric authentication (Face ID / Touch ID) enable/disable
 * - Account information display
 * - Sign out option
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function SettingsScreen() {
  const { state, signOut, enableBiometrics, disableBiometrics, biometricSupport } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggleBiometric(value: boolean) {
    if (!biometricSupport.isSupported) {
      Alert.alert(
        'Not Supported',
        'Biometric authentication is not supported on this device.'
      );
      return;
    }

    if (!biometricSupport.isEnrolled) {
      Alert.alert(
        'Not Enrolled',
        'Please set up Face ID or Touch ID in your device settings first.'
      );
      return;
    }

    setLoading(true);
    try {
      if (value) {
        await enableBiometrics();
        setBiometricEnabled(true);
        Alert.alert(
          'Biometric Enabled',
          'You can now use Face ID / Touch ID to sign in quickly.'
        );
      } else {
        await disableBiometrics();
        setBiometricEnabled(false);
        Alert.alert('Biometric Disabled', 'Biometric authentication has been disabled.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometric settings.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{state.user?.email || 'Not available'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {state.user
                  ? `${state.user.first_name || ''} ${state.user.last_name || ''}`.trim() ||
                    'Not set'
                  : 'Not available'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>
                {state.user?.role ? state.user.role.replace('_', ' ').toUpperCase() : 'Medic'}
              </Text>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                  {biometricSupport.isSupported ? '🔒 Face ID / Touch ID' : '🔒 Biometric'}
                </Text>
                <Text style={styles.settingDescription}>
                  {biometricSupport.isSupported
                    ? 'Sign in quickly with biometric authentication'
                    : 'Not supported on this device'}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                disabled={!biometricSupport.isSupported || loading}
                trackColor={{ false: '#cbd5e1', true: '#10B981' }}
                thumbColor={biometricEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>

          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connection</Text>
              <View
                style={[
                  styles.statusBadge,
                  state.isOnline ? styles.statusOnline : styles.statusOffline,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    state.isOnline ? styles.statusTextOnline : styles.statusTextOffline,
                  ]}
                >
                  {state.isOnline ? '● Online' : '● Offline'}
                </Text>
              </View>
            </View>

            {state.isOfflineSession && (
              <View style={styles.offlineNotice}>
                <Text style={styles.offlineNoticeText}>
                  📡 You're using a cached session. Some features may be unavailable until you
                  reconnect.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sign Out Button */}
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </Pressable>

        {/* Footer */}
        <Text style={styles.footer}>SiteMedic v1.0</Text>
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
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  infoRow: {
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusOnline: {
    backgroundColor: '#d1fae5',
  },
  statusOffline: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusTextOnline: {
    color: '#065f46',
  },
  statusTextOffline: {
    color: '#991b1b',
  },
  offlineNotice: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  offlineNoticeText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  signOutButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  footer: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
});
