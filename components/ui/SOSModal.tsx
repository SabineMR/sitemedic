/**
 * SOSModal.tsx
 *
 * Full-screen emergency alert composition modal. Shown after medic confirms SOS.
 *
 * WHY: The medic needs to quickly send either a voice recording (auto-transcribed)
 * or a typed message to the site contact. The live transcription panel builds
 * confidence that the voice message is captured correctly.
 *
 * Flow:
 * Step 1 — Choose type: "Record Voice" or "Type Message"
 * Step 2a — Voice: record up to 90s, see live transcript, then send
 * Step 2b — Text: large text input pre-filled with site context, then send
 * Step 3 — Sending state with spinner → success or error
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { emergencyAlertService, EmergencyContact } from '../../services/EmergencyAlertService';
import { supabase } from '../../src/lib/supabase';

type Step = 'choose' | 'record' | 'text' | 'sending' | 'success' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MAX_RECORDING_SECONDS = 90;

export default function SOSModal({ visible, onClose }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const [transcript, setTranscript] = useState('');
  const [textMessage, setTextMessage] = useState('EMERGENCY: ');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [medicInfo, setMedicInfo] = useState<{ name: string; siteName: string; orgId: string } | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveAnim = useRef(new Animated.Value(0.3)).current;

  // Load contacts and medic info when modal opens
  useEffect(() => {
    if (visible) {
      loadData();
    } else {
      resetState();
    }
  }, [visible]);

  // Waveform animation while recording
  useEffect(() => {
    if (isRecording) {
      const wave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
      );
      wave.start();
      return () => wave.stop();
    }
  }, [isRecording, waveAnim]);

  const loadData = async () => {
    try {
      const [contactsData, userResult] = await Promise.all([
        emergencyAlertService.getContacts(),
        supabase.auth.getUser(),
      ]);

      setContacts(contactsData);
      if (contactsData.length > 0) {
        setSelectedContact(contactsData[0]);
      }

      if (userResult.data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, org_id')
          .eq('id', userResult.data.user.id)
          .single();

        if (profile) {
          setMedicInfo({
            name: profile.full_name || 'Medic',
            siteName: 'Construction Site', // TODO: pull from active booking
            orgId: profile.org_id,
          });
          setTextMessage(`EMERGENCY: Construction Site — `);
        }
      }
    } catch (error) {
      console.error('[SOSModal] Failed to load data:', error);
    }
  };

  const resetState = () => {
    setStep('choose');
    setIsRecording(false);
    setSecondsLeft(MAX_RECORDING_SECONDS);
    setTranscript('');
    setTextMessage('EMERGENCY: ');
    setAudioUri(null);
    setErrorMessage('');
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const startRecording = async () => {
    setStep('record');
    setIsRecording(true);
    setSecondsLeft(MAX_RECORDING_SECONDS);
    setTranscript('');

    try {
      await emergencyAlertService.startRecording(
        (chunk) => setTranscript((prev) => prev + ' ' + chunk),
        () => stopRecording(), // auto-stop at 90s
      );

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('[SOSModal] Failed to start recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setIsRecording(false);

    const uri = await emergencyAlertService.stopRecording();
    setAudioUri(uri);
  };

  const handleSend = async () => {
    if (!selectedContact || !medicInfo) {
      setErrorMessage('No emergency contact selected. Please add contacts in Settings.');
      setStep('error');
      return;
    }

    setStep('sending');

    try {
      let uploadedAudioUrl: string | undefined;
      let finalTextMessage: string | undefined;

      if (step !== 'sending') {
        // This block won't run — handled by the calling step
      }

      // Upload audio if we have it
      if (audioUri) {
        uploadedAudioUrl = await emergencyAlertService.uploadAudio(audioUri) || undefined;
        finalTextMessage = transcript.trim() || undefined;
      } else {
        finalTextMessage = textMessage.trim();
      }

      await emergencyAlertService.sendAlert({
        contactId: selectedContact.id,
        messageType: audioUri ? 'voice' : 'text',
        textMessage: finalTextMessage,
        audioUrl: uploadedAudioUrl,
        medicName: medicInfo.name,
        siteName: medicInfo.siteName,
      });

      setStep('success');
    } catch (error: any) {
      console.error('[SOSModal] Failed to send alert:', error);
      setErrorMessage(error?.message || 'Unknown error');
      setStep('error');
    }
  };

  const handleSendFromRecord = async () => {
    if (isRecording) {
      await stopRecording();
    }
    await handleSend();
  };

  const handleSendFromText = async () => {
    await handleSend();
  };

  const renderChooseStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Alert Type</Text>
      <Text style={styles.stepSubtitle}>
        Select how to send your emergency message
      </Text>

      {contacts.length === 0 ? (
        <View style={styles.noContactWarning}>
          <Text style={styles.noContactText}>
            No emergency contacts set up. Please add a contact in Settings before using SOS.
          </Text>
        </View>
      ) : (
        <View style={styles.contactSelector}>
          <Text style={styles.contactLabel}>Alerting:</Text>
          <Text style={styles.contactName}>
            {selectedContact?.name || 'No contact selected'}
          </Text>
          <Text style={styles.contactPhone}>{selectedContact?.phone}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.typeButton, styles.typeButtonVoice]}
        onPress={startRecording}
        disabled={contacts.length === 0}
      >
        <Text style={styles.typeButtonIcon}>🎙️</Text>
        <Text style={styles.typeButtonTitle}>Record Voice Message</Text>
        <Text style={styles.typeButtonDesc}>Up to 90 seconds — auto-transcribed by AI</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.typeButton, styles.typeButtonText]}
        onPress={() => setStep('text')}
        disabled={contacts.length === 0}
      >
        <Text style={styles.typeButtonIcon}>✏️</Text>
        <Text style={styles.typeButtonTitle}>Type Quick Message</Text>
        <Text style={styles.typeButtonDesc}>Send a pre-filled emergency text</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecordStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {isRecording ? 'Recording...' : 'Recording Stopped'}
      </Text>

      {/* Countdown timer */}
      <Text style={[styles.countdown, secondsLeft <= 10 && styles.countdownUrgent]}>
        {secondsLeft}s
      </Text>

      {/* Waveform animation */}
      <View style={styles.waveContainer}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveBar,
              isRecording && {
                transform: [
                  {
                    scaleY: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3 + i * 0.1, 0.8 + i * 0.1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Record / Stop button */}
      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.recordButtonText}>
          {isRecording ? 'Stop Recording' : 'Resume Recording'}
        </Text>
      </TouchableOpacity>

      {/* Live transcript */}
      <View style={styles.transcriptContainer}>
        <Text style={styles.transcriptLabel}>
          {isRecording && transcript.length === 0 ? 'Transcribing...' : 'Live Transcript:'}
        </Text>
        <ScrollView style={styles.transcriptScroll} bounces={false}>
          <Text style={styles.transcriptText}>
            {transcript || (isRecording ? '' : 'No transcript yet')}
          </Text>
        </ScrollView>
      </View>

      {/* Send button (active when not recording or recording stopped) */}
      <TouchableOpacity
        style={styles.sendButton}
        onPress={handleSendFromRecord}
      >
        <Text style={styles.sendButtonText}>
          {isRecording ? 'Stop & Send Emergency Alert' : 'Send Emergency Alert'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTextStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Type Emergency Message</Text>

      <TextInput
        style={styles.textInput}
        value={textMessage}
        onChangeText={setTextMessage}
        multiline
        numberOfLines={5}
        placeholder="Describe the emergency..."
        placeholderTextColor="#9CA3AF"
        autoFocus
        returnKeyType="default"
      />

      <TouchableOpacity
        style={[styles.sendButton, textMessage.trim().length < 5 && styles.sendButtonDisabled]}
        onPress={handleSendFromText}
        disabled={textMessage.trim().length < 5}
      >
        <Text style={styles.sendButtonText}>Send Emergency Alert</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSendingStep = () => (
    <View style={[styles.stepContainer, styles.centeredStep]}>
      <ActivityIndicator size="large" color="#DC2626" />
      <Text style={styles.sendingText}>
        Sending alert to {selectedContact?.name}...
      </Text>
      <Text style={styles.sendingSubtext}>
        SMS fallback in 60 seconds if unacknowledged
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={[styles.stepContainer, styles.centeredStep]}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.successTitle}>Alert Sent</Text>
      <Text style={styles.successBody}>
        {selectedContact?.name} has been notified.{'\n'}
        Help is on the way.
      </Text>
      <TouchableOpacity style={styles.doneButton} onPress={onClose}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorStep = () => (
    <View style={[styles.stepContainer, styles.centeredStep]}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Alert Failed</Text>
      <Text style={styles.errorBody}>{errorMessage}</Text>
      {selectedContact?.phone ? (
        <Text style={styles.errorCallPrompt}>
          Call directly: {selectedContact.phone}
        </Text>
      ) : null}
      <TouchableOpacity style={styles.retryButton} onPress={() => setStep('choose')}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.doneButton} onPress={onClose}>
        <Text style={styles.doneButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={step === 'success' || step === 'error' ? onClose : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🚨 EMERGENCY ALERT</Text>
          {(step === 'choose' || step === 'text') && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'choose' && renderChooseStep()}
          {step === 'record' && renderRecordStep()}
          {step === 'text' && renderTextStep()}
          {step === 'sending' && renderSendingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const RED = '#DC2626';
const DARK_RED = '#991B1B';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: RED,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#FECACA',
    fontSize: 20,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContainer: {
    padding: 24,
    flex: 1,
  },
  centeredStep: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  stepSubtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  noContactWarning: {
    backgroundColor: '#451A03',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#92400E',
  },
  noContactText: {
    color: '#FDE68A',
    fontSize: 14,
    lineHeight: 20,
  },
  contactSelector: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  contactLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  contactName: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  contactPhone: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 2,
  },
  typeButton: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    borderWidth: 2,
  },
  typeButtonVoice: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: RED,
  },
  typeButtonText: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: '#374151',
  },
  typeButtonIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  typeButtonTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  typeButtonDesc: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  countdown: {
    color: '#F9FAFB',
    fontSize: 64,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 12,
  },
  countdownUrgent: {
    color: '#FCA5A5',
  },
  waveContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
    gap: 6,
    marginBottom: 24,
  },
  waveBar: {
    width: 8,
    height: 40,
    backgroundColor: RED,
    borderRadius: 4,
  },
  recordButton: {
    backgroundColor: RED,
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  recordButtonActive: {
    backgroundColor: DARK_RED,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  transcriptContainer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    minHeight: 80,
    maxHeight: 150,
  },
  transcriptLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  transcriptScroll: {
    maxHeight: 100,
  },
  transcriptText: {
    color: '#F9FAFB',
    fontSize: 14,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#F9FAFB',
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: '#374151',
    minHeight: 140,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
  },
  sendingText: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  sendingSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
  },
  successBody: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#FCA5A5',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 12,
  },
  errorBody: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  errorCallPrompt: {
    color: '#FBBF24',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: RED,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  doneButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 16,
  },
});
