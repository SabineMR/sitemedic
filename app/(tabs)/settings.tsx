/**
 * Settings Screen
 *
 * User preferences and account settings.
 * Implements AUTH-03 requirement (biometric authentication toggle).
 *
 * Features:
 * - Biometric authentication (Face ID / Touch ID) enable/disable
 * - Emergency Contacts management (add/delete managers for SOS alerts)
 * - Account information display
 * - Sign out option
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRole } from '../../hooks/useRole';
import { emergencyAlertService, EmergencyContact } from '../../services/EmergencyAlertService';

const VERTICAL_LABELS: Record<string, string> = {
  construction: 'Construction',
  tv_film: 'TV & Film',
  motorsport: 'Motorsport',
  festivals: 'Festivals',
  sporting_events: 'Sporting Events',
  fairs_shows: 'Fairs & Shows',
  corporate: 'Corporate',
  private_events: 'Private Events',
  education: 'Education',
  outdoor_adventure: 'Outdoor Adventure',
};

export default function SettingsScreen() {
  const { state, signOut, enableBiometrics, disableBiometrics, biometricSupport } = useAuth();
  const { isAdmin } = useRole();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Org settings state (admin only)
  const [orgSettings, setOrgSettings] = useState<{
    industry_verticals: string[];
    cqc_registered: boolean;
    cqc_registration_number: string | null;
  } | null>(null);
  const [orgSettingsLoading, setOrgSettingsLoading] = useState(isAdmin);

  useEffect(() => {
    if (!isAdmin || !state.user?.orgId) return;
    import('../../src/lib/supabase').then(({ supabase }) => {
      supabase
        .from('org_settings')
        .select('industry_verticals, cqc_registered, cqc_registration_number')
        .eq('org_id', state.user!.orgId)
        .single()
        .then(({ data }) => {
          if (data) setOrgSettings(data as any);
          setOrgSettingsLoading(false);
        });
    });
  }, [isAdmin, state.user?.orgId]);

  // Google Calendar state
  const [gcalMedics, setGcalMedics] = useState<Array<{ id: string; first_name: string; last_name: string; connected: boolean }>>([]);
  const [gcalMedicsLoading, setGcalMedicsLoading] = useState(isAdmin);
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);

  // Fetch Google Calendar connection status
  useEffect(() => {
    if (!state.user?.orgId) return;

    import('../../src/lib/supabase').then(async ({ supabase }) => {
      if (isAdmin) {
        // Admin: fetch all medics and their GCal status
        const { data: medics } = await supabase
          .from('medics')
          .select('id, first_name, last_name')
          .eq('org_id', state.user!.orgId)
          .order('last_name', { ascending: true });

        if (medics && medics.length > 0) {
          const medicIds = medics.map((m: any) => m.id);
          const { data: prefs } = await supabase
            .from('medic_preferences')
            .select('medic_id, google_calendar_enabled')
            .in('medic_id', medicIds)
            .eq('google_calendar_enabled', true);

          const connectedIds = new Set((prefs ?? []).map((p: any) => p.medic_id));
          setGcalMedics(medics.map((m: any) => ({
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            connected: connectedIds.has(m.id),
          })));
        }
        setGcalMedicsLoading(false);
      } else {
        // Medic: fetch own GCal status
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: medic } = await supabase
          .from('medics')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (medic) {
          const { data: prefs } = await supabase
            .from('medic_preferences')
            .select('google_calendar_enabled')
            .eq('medic_id', (medic as any).id)
            .single();
          setGcalConnected((prefs as any)?.google_calendar_enabled === true);
        }
      }
    });
  }, [isAdmin, state.user?.orgId]);

  // Emergency contacts state
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<EmergencyContact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const roleInputRef = useRef<any>(null);

  useEffect(() => {
    if (!isAdmin) loadContacts();
  }, []);

  // Reset suggestions when modal closes
  useEffect(() => {
    if (!addModalVisible) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [addModalVisible]);

  // Debounced search: fires when newName changes, queries matching org contacts
  useEffect(() => {
    const orgId = state.user?.orgId;
    if (!orgId || newName.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { supabase } = await import('../../src/lib/supabase');
        const { data } = await supabase
          .from('emergency_contacts')
          .select('id, name, phone, role')
          .eq('org_id', orgId)
          .ilike('name', `%${newName.trim()}%`)
          .limit(5);
        setSuggestions((data as EmergencyContact[]) ?? []);
        setShowSuggestions((data?.length ?? 0) > 0);
      } catch (_) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newName, state.user?.orgId]);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const data = await emergencyAlertService.getContacts();
      setContacts(data);
    } catch (error) {
      console.error('[Settings] Failed to load emergency contacts:', error);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const formatUKPhone = (text: string): string => {
    // Strip everything except digits
    let digits = text.replace(/\D/g, '');

    // Remove leading country code (44) or trunk prefix (0)
    if (digits.startsWith('44')) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    // UK national number is 10 digits
    digits = digits.slice(0, 10);

    if (digits.length === 0) return '';
    if (digits.length <= 4) return `+44 ${digits}`;
    return `+44 ${digits.slice(0, 4)} ${digits.slice(4)}`;
  };

  const handleSelectSuggestion = (contact: EmergencyContact) => {
    setNewName(contact.name);
    setNewPhone(contact.phone);
    setNewRole(contact.role || '');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Missing fields', 'Please enter both a name and phone number.');
      return;
    }

    setSaving(true);
    try {
      const { supabase } = await import('../../src/lib/supabase');
      const { authManager } = await import('../../src/lib/auth-manager');

      // --- Resolve userId ---
      // Step 1: getUser() validates the JWT with the server (works when session is fresh)
      let userId: string | null = null;
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      userId = user?.id ?? null;
      console.log('[Settings] getUser:', userId ? 'ok' : 'null', '| error:', getUserError?.message);

      // Step 2: getUser failed — JWT may have been cleared by a failed token refresh.
      // Try restoring the session from our AsyncStorage cache (set at INITIAL_SESSION /
      // SIGNED_IN). setSession() will attempt a token refresh if the access_token is expired
      // but the refresh_token is still valid. If internet is accessible this will succeed.
      if (!userId) {
        const cachedSession = await authManager.getCachedSession();
        if (cachedSession) {
          const { data: { session: restored } } = await supabase.auth.setSession({
            access_token: cachedSession.access_token,
            refresh_token: cachedSession.refresh_token,
          });
          userId = restored?.user?.id ?? null;
          console.log('[Settings] setSession restore:', userId ? 'ok' : 'null');
        }
      }

      // --- Resolve orgId ---
      let orgId: string | null = null;

      // Step 3: cached profile (works offline, populated on last successful DB fetch)
      if (!userId) {
        const cachedProfile = await authManager.getCachedProfile();
        orgId = cachedProfile?.orgId ?? null;
        console.log('[Settings] cached profile orgId:', orgId);
      }

      // Step 4: query profiles table (requires network + valid session from steps 1-2)
      if (!orgId && userId) {
        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', userId)
          .single();
        orgId = (profileRow as any)?.org_id ?? null;
        console.log('[Settings] profiles query: org_id =', orgId, '| error:', profileErr?.message);
      }

      if (!orgId) throw new Error('Could not load org');

      // Check for existing contact with same phone in this org
      const { data: existingRaw } = await supabase
        .from('emergency_contacts')
        .select('id')
        .eq('org_id', orgId)
        .eq('phone', newPhone.trim())
        .maybeSingle();
      const existing = existingRaw as { id: string } | null;

      if (existing) {
        // Update existing contact's name and role
        const { error } = await supabase
          .from('emergency_contacts')
          .update({ name: newName.trim(), role: newRole.trim() || null, source: 'manual' } as any)
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        // Insert new contact
        const { error } = await supabase
          .from('emergency_contacts')
          .insert({
            org_id: orgId,
            name: newName.trim(),
            phone: newPhone.trim(),
            role: newRole.trim() || null,
            source: 'manual',
          } as any);
        if (error) throw new Error(error.message);
      }

      setNewName('');
      setNewPhone('');
      setNewRole('');
      setAddModalVisible(false);
      await loadContacts();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name} from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { supabase } = await import('../../src/lib/supabase');
              await supabase.from('emergency_contacts').delete().eq('id', contact.id);
              await loadContacts();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove contact.');
            }
          },
        },
      ],
    );
  };

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
                  ? state.user.fullName || 'Not set'
                  : 'Not available'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Organisation</Text>
              <Text style={styles.infoValue}>
                {state.user?.orgName || 'Not available'}
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

        {/* Organisation Section (admin only) */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisation</Text>

            <View style={styles.card}>
              {orgSettingsLoading ? (
                <ActivityIndicator color="#2563EB" style={{ paddingVertical: 20 }} />
              ) : (<>
              {/* Industry Verticals */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Industry Verticals</Text>
                {orgSettings && orgSettings.industry_verticals?.length > 0 ? (
                  <View style={styles.verticalChips}>
                    {orgSettings.industry_verticals.map((v) => (
                      <View key={v} style={styles.chip}>
                        <Text style={styles.chipText}>
                          {VERTICAL_LABELS[v] ?? v}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.infoValue}>—</Text>
                )}
              </View>

              <View style={styles.divider} />

              {/* CQC Status */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>CQC Status</Text>
                {orgSettings ? (
                  orgSettings.cqc_registered ? (
                    <View>
                      <View style={styles.cqcRegistered}>
                        <Text style={styles.cqcRegisteredText}>● Registered</Text>
                      </View>
                      {orgSettings.cqc_registration_number ? (
                        <Text style={styles.cqcNumber}>
                          {orgSettings.cqc_registration_number}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.infoValue}>Not registered</Text>
                  )
                ) : (
                  <Text style={styles.infoValue}>—</Text>
                )}
              </View>
              </>)}
            </View>
          </View>
        )}

        {/* Emergency Contacts Section (medic / site_manager only) */}
        {!isAdmin && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDesc}>
            These people receive an alert when you press SOS.
          </Text>

          <View style={styles.card}>
            {contactsLoading ? (
              <ActivityIndicator color="#EF4444" style={{ paddingVertical: 16 }} />
            ) : contacts.length === 0 ? (
              <View style={styles.emptyContacts}>
                <Text style={styles.emptyContactsIcon}>🚨</Text>
                <Text style={styles.emptyContactsText}>No emergency contacts yet.</Text>
                <Text style={styles.emptyContactsSubtext}>
                  Add a manager or site contact so SOS alerts are delivered.
                </Text>
              </View>
            ) : (
              contacts.map((contact, index) => (
                <View key={contact.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.contactRow}>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                      {contact.role ? (
                        <Text style={styles.contactRole}>{contact.role}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteContact(contact)}
                    >
                      <Text style={styles.deleteButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
        )}

        {/* Google Calendar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Calendar</Text>

          <View style={styles.card}>
            {isAdmin ? (
              gcalMedicsLoading ? (
                <ActivityIndicator color="#7C3AED" style={{ paddingVertical: 20 }} />
              ) : gcalMedics.length === 0 ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoValue}>No medics in this organisation.</Text>
                </View>
              ) : (
                <>
                  {gcalMedics.map((medic, index) => (
                    <View key={medic.id}>
                      {index > 0 && <View style={styles.divider} />}
                      <View style={styles.gcalMedicRow}>
                        <Text style={styles.gcalMedicName}>
                          {medic.first_name} {medic.last_name}
                        </Text>
                        <View style={[
                          styles.gcalBadge,
                          medic.connected ? styles.gcalBadgeConnected : styles.gcalBadgeDisconnected,
                        ]}>
                          <Text style={[
                            styles.gcalBadgeText,
                            medic.connected ? styles.gcalBadgeTextConnected : styles.gcalBadgeTextDisconnected,
                          ]}>
                            {medic.connected ? 'Connected' : 'Not Connected'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  <View style={styles.divider} />
                  <Text style={styles.gcalSummary}>
                    {gcalMedics.filter((m) => m.connected).length} of {gcalMedics.length} medic{gcalMedics.length !== 1 ? 's' : ''} connected
                  </Text>
                </>
              )
            ) : (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Calendar Sync</Text>
                {gcalConnected === null ? (
                  <Text style={styles.infoValue}>Loading...</Text>
                ) : gcalConnected ? (
                  <View style={styles.gcalBadge}>
                    <Text style={[styles.gcalBadgeText, styles.gcalBadgeTextConnected]}>
                      Connected
                    </Text>
                  </View>
                ) : (
                  <View>
                    <View style={[styles.gcalBadge, styles.gcalBadgeDisconnected]}>
                      <Text style={[styles.gcalBadgeText, styles.gcalBadgeTextDisconnected]}>
                        Not Connected
                      </Text>
                    </View>
                    <Text style={styles.gcalHint}>
                      Connect via the web portal at /medic/profile
                    </Text>
                  </View>
                )}
              </View>
            )}
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

      {/* Add Contact Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. John Smith"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            />

            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.suggestionItem, index < suggestions.length - 1 && styles.suggestionBorder]}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <Text style={styles.suggestionDetail}>
                      {item.phone}{item.role ? ` · ${item.role}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.fieldLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={newPhone}
              onChangeText={(text) => setNewPhone(formatUKPhone(text))}
              placeholder="e.g. +44 7700 900000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              returnKeyType="next"
              maxLength={15}
              onSubmitEditing={() => roleInputRef.current?.focus()}
            />

            <Text style={styles.fieldLabel}>Role / Title (optional)</Text>
            <TextInput
              ref={roleInputRef}
              style={styles.input}
              value={newRole}
              onChangeText={setNewRole}
              placeholder="e.g. Site Manager"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddContact}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Contact</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  emptyContacts: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyContactsIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyContactsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  emptyContactsSubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#64748b',
  },
  contactRole: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  modalBody: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  saveButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  verticalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  cqcRegistered: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cqcRegisteredText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  cqcNumber: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  gcalMedicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  gcalMedicName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  gcalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  gcalBadgeConnected: {
    backgroundColor: '#D1FAE5',
  },
  gcalBadgeDisconnected: {
    backgroundColor: '#F1F5F9',
  },
  gcalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gcalBadgeTextConnected: {
    color: '#065F46',
  },
  gcalBadgeTextDisconnected: {
    color: '#64748B',
  },
  gcalSummary: {
    fontSize: 13,
    color: '#94a3b8',
    paddingTop: 12,
  },
  gcalHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  suggestionDetail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
});
