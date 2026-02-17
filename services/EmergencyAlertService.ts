/**
 * EmergencyAlertService.ts
 *
 * Core service for the Emergency SOS Alert System.
 *
 * WHY: Construction site medics need a one-tap emergency button that sends
 * audio or text alerts to pre-registered site contacts. This service handles
 * the full flow: permissions → recording → upload → push notification → SMS fallback.
 *
 * KEY FEATURES:
 * - Push notification registration (Expo Push Token saved to profiles)
 * - Audio recording (90s max, m4a format via expo-av)
 * - Live chunked transcription every 5s via Edge Function (Whisper)
 * - Full recording upload to Supabase Storage (emergency-recordings bucket)
 * - Alert row insertion + Expo Push API call
 * - Alert acknowledgment (clears the full-screen alert on recipient's device)
 */

import { supabase } from '../src/lib/supabase';

// Lazily require native-backed packages so the service degrades gracefully
// if the native binary doesn't include them (e.g. a stripped build or Expo Go).
let Notifications: any = null;
let Audio: any = null;
let FileSystem: any = null;

try { Notifications = require('expo-notifications'); } catch (_) {}
try { Audio = require('expo-av').Audio; } catch (_) {}
try { FileSystem = require('expo-file-system'); } catch (_) {}

// Notification channel for emergency alerts (Android)
const EMERGENCY_CHANNEL_ID = 'emergency';
const MAX_RECORDING_DURATION_MS = 90_000; // 90 seconds
const TRANSCRIPTION_CHUNK_INTERVAL_MS = 5_000; // 5 seconds
const AUDIO_BUCKET = 'emergency-recordings';

export interface EmergencyContact {
  id: string;
  org_id: string;
  name: string;
  phone: string;
  email?: string | null;
  push_token?: string | null;
  role?: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyAlert {
  id: string;
  org_id: string;
  sent_by: string;
  booking_id?: string | null;
  contact_id: string;
  message_type: 'voice' | 'text';
  text_message?: string | null;
  audio_url?: string | null;
  push_sent_at?: string | null;
  sms_sent_at?: string | null;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  created_at: string;
}

interface SendAlertParams {
  contactId: string;
  bookingId?: string;
  messageType: 'voice' | 'text';
  textMessage?: string;
  audioUrl?: string;
  medicName: string;
  siteName: string;
}

class EmergencyAlertService {
  private recording: any | null = null;
  private transcriptionInterval: ReturnType<typeof setInterval> | null = null;
  private stopRecordingTimeout: ReturnType<typeof setTimeout> | null = null;
  private onTranscriptChunk: ((text: string) => void) | null = null;
  private lastChunkPosition = 0;

  /**
   * Request notification and microphone permissions.
   * Called on app startup from app/_layout.tsx.
   */
  async requestPermissions(): Promise<{ notifications: boolean; microphone: boolean }> {
    let notifGranted = false;

    if (Notifications) {
      const { status: notifStatus } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
      });
      notifGranted = notifStatus === 'granted';

      // Configure Android notification channel for emergency alerts
      await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
        name: 'Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'emergency-alert.wav',
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        enableLights: true,
        lightColor: '#EF4444',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }

    let micGranted = false;
    if (Audio) {
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      micGranted = micStatus === 'granted';
    }

    return {
      notifications: notifGranted,
      microphone: micGranted,
    };
  }

  /**
   * Get Expo push token and save it to profiles.push_token in Supabase.
   * WHY: Recipients need their token saved so the medic's app can target them.
   */
  async registerPushToken(): Promise<string | null> {
    if (!Notifications) {
      console.warn('[EmergencyAlert] Push notifications unavailable — skipping token registration');
      return null;
    }
    try {
      const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      if (!tokenData) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      await supabase
        .from('profiles')
        .update({
          push_token: tokenData,
          push_token_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      console.log('[EmergencyAlert] Push token registered:', tokenData.slice(0, 20) + '...');
      return tokenData;
    } catch (error) {
      console.warn('[EmergencyAlert] Could not register push token:', error);
      return null;
    }
  }

  /**
   * Start audio recording (up to 90 seconds).
   * Begins chunked transcription every 5 seconds.
   *
   * @param onTranscript - callback called with each new transcript chunk text
   * @param onAutoStop - callback called when 90s limit is reached
   */
  async startRecording(
    onTranscript: (text: string) => void,
    onAutoStop: () => void,
  ): Promise<void> {
    if (!Audio) {
      console.warn('[EmergencyAlert] expo-av unavailable — cannot record');
      return;
    }
    if (this.recording) {
      console.warn('[EmergencyAlert] Recording already in progress');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );

    this.recording = recording;
    this.onTranscriptChunk = onTranscript;
    this.lastChunkPosition = 0;

    console.log('[EmergencyAlert] Recording started');

    // Auto-stop at 90 seconds
    this.stopRecordingTimeout = setTimeout(async () => {
      console.log('[EmergencyAlert] Auto-stopping recording at 90s');
      onAutoStop();
    }, MAX_RECORDING_DURATION_MS);

    // Start chunked transcription every 5 seconds
    this.transcriptionInterval = setInterval(() => {
      this.transcribeLatestChunk();
    }, TRANSCRIPTION_CHUNK_INTERVAL_MS);
  }

  /**
   * Stop audio recording and return the local file URI.
   */
  async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      console.warn('[EmergencyAlert] No recording to stop');
      return null;
    }

    // Cancel auto-stop and transcription timers
    if (this.stopRecordingTimeout) {
      clearTimeout(this.stopRecordingTimeout);
      this.stopRecordingTimeout = null;
    }
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;
    this.onTranscriptChunk = null;

    // Reset audio mode
    if (Audio) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    }

    console.log('[EmergencyAlert] Recording stopped, URI:', uri);
    return uri || null;
  }

  /**
   * Export current recording position as a chunk and send to transcription edge function.
   * WHY: Gives the medic live confidence their voice is being captured accurately.
   */
  private async transcribeLatestChunk(): Promise<void> {
    if (!this.recording || !this.onTranscriptChunk) return;

    try {
      const status = await this.recording.getStatusAsync();
      if (!status.isRecording) return;

      // Get the recording URI and send the full recording so far for incremental transcription
      const uri = this.recording.getURI();
      if (!uri) return;

      // Read the audio file as base64
      if (!FileSystem) return;
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // POST to edge function for Whisper transcription
      const { data, error } = await supabase.functions.invoke('send-emergency-sms', {
        body: {
          action: 'transcribe',
          audioBase64: base64Audio,
          mimeType: 'audio/m4a',
        },
      });

      if (!error && data?.transcript) {
        this.onTranscriptChunk(data.transcript);
      }
    } catch (error) {
      // Non-fatal — transcription is best-effort
      console.warn('[EmergencyAlert] Chunk transcription failed:', error);
    }
  }

  /**
   * Upload audio recording to Supabase Storage.
   * Returns the public URL of the uploaded file.
   */
  async uploadAudio(localUri: string): Promise<string | null> {
    if (!FileSystem) {
      console.warn('[EmergencyAlert] expo-file-system unavailable — cannot upload audio');
      return null;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}.m4a`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert to ArrayBuffer for upload
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(fileName, bytes.buffer, {
          contentType: 'audio/m4a',
          upsert: false,
        });

      if (error) {
        console.error('[EmergencyAlert] Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(fileName);

      console.log('[EmergencyAlert] Audio uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[EmergencyAlert] Failed to upload audio:', error);
      return null;
    }
  }

  /**
   * Send an emergency alert:
   * 1. Insert emergency_alerts row
   * 2. Send push notification via Expo Push API
   * 3. Save contact to emergency_contacts if new
   */
  async sendAlert(params: SendAlertParams): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get org_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) throw new Error('Could not load profile');

    // Insert the alert row
    const { data: alert, error: insertError } = await supabase
      .from('emergency_alerts')
      .insert({
        org_id: profile.org_id,
        sent_by: user.id,
        booking_id: params.bookingId || null,
        contact_id: params.contactId,
        message_type: params.messageType,
        text_message: params.textMessage || null,
        audio_url: params.audioUrl || null,
        push_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !alert) {
      throw new Error('Failed to create alert: ' + insertError?.message);
    }

    // Get contact's push token
    const { data: contact } = await supabase
      .from('emergency_contacts')
      .select('push_token, name')
      .eq('id', params.contactId)
      .single();

    // Send push notification via Expo Push API
    if (contact?.push_token) {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: contact.push_token,
            sound: 'emergency-alert.wav',
            title: '🚨 EMERGENCY — SiteMedic',
            body: `${params.medicName} has triggered an emergency alert at ${params.siteName}`,
            data: {
              alertId: alert.id,
              type: 'emergency',
              medicName: params.medicName,
              siteName: params.siteName,
              audioUrl: params.audioUrl || null,
              textMessage: params.textMessage || null,
            },
            priority: 'high',
            channelId: EMERGENCY_CHANNEL_ID,
            ttl: 300,
          }),
        });

        console.log('[EmergencyAlert] Push notification sent to:', contact.name);
      } catch (pushError) {
        console.warn('[EmergencyAlert] Push notification failed (SMS fallback will handle):', pushError);
      }
    } else {
      console.warn('[EmergencyAlert] Contact has no push token — SMS fallback will fire after 60s');
    }

    return alert.id;
  }

  /**
   * Mark an alert as acknowledged. Called when recipient taps "ACKNOWLEDGED".
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('emergency_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      })
      .eq('id', alertId);

    if (error) {
      console.error('[EmergencyAlert] Failed to acknowledge alert:', error);
      throw error;
    }

    console.log('[EmergencyAlert] Alert acknowledged:', alertId);
  }

  /**
   * Get or create an emergency contact from booking data.
   * WHY: We seed contacts from booking records so medics don't need to
   * manually enter phone numbers in an emergency.
   */
  async upsertContactFromBooking(params: {
    orgId: string;
    name: string;
    phone: string;
    role?: string;
  }): Promise<string> {
    // Check if contact already exists for this org + phone
    const { data: existing } = await supabase
      .from('emergency_contacts')
      .select('id')
      .eq('org_id', params.orgId)
      .eq('phone', params.phone)
      .single();

    if (existing) return existing.id;

    // Create new contact
    const { data: contact, error } = await supabase
      .from('emergency_contacts')
      .insert({
        org_id: params.orgId,
        name: params.name,
        phone: params.phone,
        role: params.role || null,
        source: 'booking',
      })
      .select('id')
      .single();

    if (error || !contact) {
      throw new Error('Failed to create emergency contact: ' + error?.message);
    }

    console.log('[EmergencyAlert] Created new emergency contact:', params.name);
    return contact.id;
  }

  /**
   * Fetch emergency contacts for the current user's org.
   */
  async getContacts(): Promise<EmergencyContact[]> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[EmergencyAlert] Failed to fetch contacts:', error);
      return [];
    }

    return data as EmergencyContact[];
  }
}

// Singleton instance following existing service pattern
export const emergencyAlertService = new EmergencyAlertService();
export default emergencyAlertService;
