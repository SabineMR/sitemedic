/**
 * EmergencyAlertReceiver.tsx
 *
 * Recipient-side emergency alert handler. Added to app/_layout.tsx so it runs
 * on every screen for all users (not just medics).
 *
 * WHY: When a medic triggers SOS, the site manager's phone needs to show a
 * full-screen red alert immediately — even if the app is in the background.
 * This component listens for push notifications and handles the acknowledgment flow.
 *
 * Flow:
 * 1. Push notification arrives (type: 'emergency')
 * 2. Loud alert sound plays in a loop using expo-av
 * 3. Full-screen red modal covers everything
 * 4. User MUST tap "ACKNOWLEDGED" to dismiss (no swipe-away)
 * 5. acknowledgeAlert() updates the DB, stopping further SMS escalation
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { emergencyAlertService } from '../../services/EmergencyAlertService';

let Notifications: any = null;
let Audio: any = null;
try { Notifications = require('expo-notifications'); } catch (_) {}
try { Audio = require('expo-av').Audio; } catch (_) {}

// Configure foreground notification behaviour only when the module is available
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification: any) => {
      const isEmergency = notification.request.content.data?.type === 'emergency';
      return {
        shouldShowAlert: true,
        shouldPlaySound: isEmergency,
        shouldSetBadge: true,
        priority: isEmergency
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.DEFAULT,
      };
    },
  });
}

interface AlertData {
  alertId: string;
  medicName: string;
  siteName: string;
  audioUrl?: string;
  textMessage?: string;
  receivedAt: Date;
}

export default function EmergencyAlertReceiver() {
  const [activeAlert, setActiveAlert] = useState<AlertData | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const soundRef = useRef<any | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the emergency banner
  useEffect(() => {
    if (!activeAlert) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [activeAlert, pulseAnim]);

  // Listen for incoming notifications (only when expo-notifications is available)
  useEffect(() => {
    if (!Notifications) return;

    const foregroundSub = Notifications.addNotificationReceivedListener((notification: any) => {
      const data = notification.request.content.data;
      if (data?.type === 'emergency') {
        handleEmergencyAlert(data);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'emergency') {
        handleEmergencyAlert(data);
      }
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, []);

  // Clean up sound when alert is dismissed
  useEffect(() => {
    if (!activeAlert) {
      stopAlertSound();
    }
  }, [activeAlert]);

  const handleEmergencyAlert = async (data: any) => {
    const alertData: AlertData = {
      alertId: data.alertId,
      medicName: data.medicName || 'Medic',
      siteName: data.siteName || 'Unknown site',
      audioUrl: data.audioUrl,
      textMessage: data.textMessage,
      receivedAt: new Date(),
    };

    setActiveAlert(alertData);
    await playAlertSound();
  };

  const playAlertSound = async () => {
    if (!Audio) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/emergency-alert.wav'),
        { isLooping: true, volume: 1.0 },
      );

      soundRef.current = sound;
      await sound.playAsync();
      setAudioPlaying(true);
    } catch (error) {
      console.warn('[EmergencyReceiver] Could not play alert sound:', error);
    }
  };

  const stopAlertSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
      setAudioPlaying(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!activeAlert || acknowledging) return;

    setAcknowledging(true);
    await stopAlertSound();

    try {
      await emergencyAlertService.acknowledgeAlert(activeAlert.alertId);
    } catch (error) {
      console.error('[EmergencyReceiver] Acknowledgment failed:', error);
    } finally {
      setAcknowledging(false);
      setActiveAlert(null);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!activeAlert) return null;

  return (
    <Modal
      visible={!!activeAlert}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {}} // Prevent hardware back button dismissal
    >
      <View style={styles.container}>
        <Animated.View style={[styles.header, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.emergencyIcon}>🚨</Text>
          <Text style={styles.headerTitle}>EMERGENCY ALERT</Text>
          <Text style={styles.headerSubtitle}>SiteMedic</Text>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>MEDIC</Text>
            <Text style={styles.cardValue}>{activeAlert.medicName}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>LOCATION</Text>
            <Text style={styles.cardValue}>{activeAlert.siteName}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>TIME</Text>
            <Text style={styles.cardValue}>{formatTime(activeAlert.receivedAt)}</Text>
          </View>

          {activeAlert.textMessage ? (
            <View style={[styles.card, styles.messageCard]}>
              <Text style={styles.cardLabel}>MESSAGE</Text>
              <Text style={styles.messageText}>{activeAlert.textMessage}</Text>
            </View>
          ) : null}

          <Text style={styles.instruction}>
            Respond immediately. Call the medic or go to the site.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.ackButton, acknowledging && styles.ackButtonDisabled]}
            onPress={handleAcknowledge}
            disabled={acknowledging}
            activeOpacity={0.85}
          >
            <Text style={styles.ackButtonText}>
              {acknowledging ? 'Confirming...' : 'ACKNOWLEDGED — I am responding'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.ackHint}>
            Tap to confirm you have seen this alert
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7F1D1D',
  },
  header: {
    backgroundColor: '#DC2626',
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  emergencyIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
  },
  headerSubtitle: {
    color: '#FECACA',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  messageCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  instruction: {
    color: '#FCA5A5',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  footer: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: '#991B1B',
  },
  ackButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  ackButtonDisabled: {
    opacity: 0.6,
  },
  ackButtonText: {
    color: '#DC2626',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  ackHint: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
});
