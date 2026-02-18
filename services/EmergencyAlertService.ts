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

import { Platform } from 'react-native';
import { supabase } from '../src/lib/supabase';

// Lazily require native-backed packages so the service degrades gracefully
// if the native binary doesn't include them (e.g. a stripped build or Expo Go).
let Notifications: any = null;
let Audio: any = null;
let FileSystem: any = null;

try { Notifications = require('expo-notifications'); } catch (_) {}
try { Audio = require('expo-av').Audio; } catch (_) {}
try { FileSystem = require('expo-file-system/legacy'); } catch (_) {}

// ── Streaming transcription constants ────────────────────────────────────────
// iOS records LINEAR_PCM WAV at 24 kHz mono — exactly what the OpenAI Realtime
// API expects (PCM16, 24 kHz, mono, little-endian).
// Android MediaRecorder cannot write raw PCM, so we fall back to the
// existing 3-second M4A chunked-HTTP path on Android.
const STREAMING_CHUNK_INTERVAL_MS = 1_000; // 1-second PCM chunks → near-zero latency
const PCM_RECORDING_OPTIONS = {
  isMeteringEnabled: false,
  ios: {
    extension: '.wav',
    outputFormat: 'lpcm',  // IOSOutputFormat.LINEARPCM
    audioQuality: 127,     // IOSAudioQuality.MAX
    sampleRate: 24000,     // OpenAI Realtime requires 24 kHz
    numberOfChannels: 1,
    bitRate: 384000,       // 24000 * 16 bits * 1 ch
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    // Unused on Android (falls back to HTTP chunked path), but must be valid.
    extension: '.m4a',
    outputFormat: 2, // MPEG_4
    audioEncoder: 3, // AAC
    sampleRate: 24000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 384000,
  },
};

// Notification channel for emergency alerts (Android)
const EMERGENCY_CHANNEL_ID = 'emergency';
const MAX_RECORDING_DURATION_MS = 90_000; // 90 seconds
// 5s gives first feedback at ~7s (5s record + ~2s Whisper API).
// Going below 4s risks chunks being too short for meaningful transcription.
const TRANSCRIPTION_CHUNK_INTERVAL_MS = 5_000;
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
  private rotationInterval: ReturnType<typeof setInterval> | null = null;
  private stopRecordingTimeout: ReturnType<typeof setTimeout> | null = null;
  private onTranscriptChunk: ((text: string) => void) | null = null;
  private onTranscriptError: (() => void) | null = null;
  private isActive = false; // true while medic is recording (across rotations)

  // ── Streaming transcription state ───────────────────────────────────────
  private streamWs: WebSocket | null = null;
  private streamActive = false;
  private streamOnTranscript: ((delta: string) => void) | null = null;
  private streamOnError: (() => void) | null = null;
  // Fallback: if streaming produces no transcript within this window, switch
  // to the HTTP chunked Whisper path so the medic always gets transcription.
  private streamFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private streamHasTranscript = false;
  // True when we fell back from streaming to HTTP chunks mid-session.
  private _streamUsedHttpFallback = false;

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
   * Start a single underlying Audio.Recording instance.
   * WHY: Separated so rotation can call it without resetting isActive/timers.
   */
  private async startNewRecording(): Promise<void> {
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    this.recording = recording;
  }

  /**
   * Start audio recording (up to 90 seconds) with live transcription.
   *
   * Live transcription strategy — rotation:
   *   Every 5 seconds we stop the current recording (giving us a complete,
   *   valid .m4a file), immediately start a new one, then send the finished
   *   chunk to Whisper in the background. This avoids the iOS limitation
   *   where an in-progress .m4a cannot be read (MOOV atom missing until stop).
   *
   * @param onTranscript - callback called with each new transcript chunk text
   * @param onAutoStop - callback called when 90s limit is reached
   */
  async startRecording(
    onTranscript: (text: string) => void,
    onAutoStop: () => void,
    onTranscriptError?: () => void,
  ): Promise<void> {
    if (!Audio) {
      console.warn('[EmergencyAlert] expo-av unavailable — cannot record');
      return;
    }
    if (this.isActive) {
      // Can happen in React dev (Strict Mode fires effects twice) — silently ignore.
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    this.isActive = true;
    this.onTranscriptChunk = onTranscript;
    this.onTranscriptError = onTranscriptError || null;
    await this.startNewRecording();

    console.log('[EmergencyAlert] Recording started (rotation mode)');

    // Auto-stop at 90 seconds
    this.stopRecordingTimeout = setTimeout(() => {
      console.log('[EmergencyAlert] Auto-stopping recording at 90s');
      onAutoStop();
    }, MAX_RECORDING_DURATION_MS);

    // Rotate every 5 seconds: stop → read → start new → transcribe async
    this.rotationInterval = setInterval(async () => {
      if (!this.isActive || !this.recording) return;
      try {
        // Capture the finished recording
        const finishedRecording = this.recording;
        this.recording = null;

        await finishedRecording.stopAndUnloadAsync();
        const uri = finishedRecording.getURI();

        // Start new recording immediately so there's minimal gap
        await this.startNewRecording();

        // Send completed chunk to Whisper in background
        if (uri) {
          this.transcribeChunk(uri);
        }
      } catch (err) {
        console.warn('[EmergencyAlert] Rotation error:', err);
      }
    }, TRANSCRIPTION_CHUNK_INTERVAL_MS);
  }

  /**
   * Stop audio recording and return the local file URI of the final chunk.
   */
  async stopRecording(): Promise<string | null> {
    if (!this.isActive) {
      console.warn('[EmergencyAlert] No recording to stop');
      return null;
    }

    this.isActive = false;

    // Cancel timers
    if (this.stopRecordingTimeout) {
      clearTimeout(this.stopRecordingTimeout);
      this.stopRecordingTimeout = null;
    }
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }

    let uri: string | null = null;
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      uri = this.recording.getURI() || null;
      this.recording = null;
    }

    // Transcribe the final segment before clearing the callback.
    // This ensures short recordings (< one rotation interval) still get transcribed.
    if (uri) {
      this.transcribeChunk(uri); // fire-and-forget — callback captured inside
    }

    this.onTranscriptChunk = null;
    this.onTranscriptError = null;

    if (Audio) {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }

    console.log('[EmergencyAlert] Recording stopped, final URI:', uri);
    return uri;
  }

  /**
   * Transcribe a completed audio chunk (file at uri) via the edge function.
   * Called after a rotation stop — file is complete and readable.
   * WHY: iOS .m4a files are only valid after stopAndUnloadAsync writes the MOOV atom.
   *      Reading a live recording returns corrupted data that Whisper cannot process.
   */
  private async transcribeChunk(uri: string): Promise<void> {
    // Capture callbacks immediately — stopRecording() nulls them out and we
    // must not invoke them after the recording session has ended.
    const onChunk = this.onTranscriptChunk;
    const onError = this.onTranscriptError;
    if (!onChunk) return;
    try {
      if (!FileSystem) return;
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64', // EncodingType enum unavailable via lazy require
      });

      const { data, error } = await supabase.functions.invoke('send-emergency-sms', {
        body: {
          action: 'transcribe',
          audioBase64: base64Audio,
          mimeType: 'audio/m4a',
        },
      });

      if (error) {
        console.warn('[EmergencyAlert] Transcription error:', error);
        onError?.();
        return;
      }

      if (data?.transcript?.trim()) {
        console.log('[EmergencyAlert] Transcript chunk:', data.transcript);
        onChunk(data.transcript);
      }
    } catch (err) {
      console.warn('[EmergencyAlert] Chunk transcription failed:', err);
      onError?.();
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
        encoding: 'base64', // EncodingType enum unavailable via lazy require
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

  // ── Streaming transcription (OpenAI Realtime API) ─────────────────────────

  /**
   * Returns true if the device supports PCM streaming (iOS only for now).
   * Android falls back to the standard HTTP chunked path.
   */
  supportsStreaming(): boolean {
    return Platform.OS === 'ios';
  }

  /**
   * Start real-time streaming transcription via the OpenAI Realtime API.
   *
   * iOS: Records LINEAR_PCM WAV at 24 kHz mono, sends 1-second raw PCM16 chunks
   *      directly to OpenAI Realtime API (authenticated via an ephemeral token
   *      fetched from the realtime-transcribe edge function), receives
   *      word-by-word transcript delta events back.
   *
   * @param onTranscriptDelta  called with each word/phrase as it arrives
   * @param onAutoStop         called when the 90-second limit is reached
   * @param onError            called if the WebSocket or OpenAI connection fails
   */
  async startStreamingTranscription(
    onTranscriptDelta: (delta: string) => void,
    onAutoStop: () => void,
    onError?: () => void,
  ): Promise<void> {
    if (!Audio || !FileSystem) {
      console.warn('[EmergencyAlert] Streaming unavailable — native modules missing');
      onError?.();
      return;
    }
    if (this.streamActive) return;

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    this.streamActive = true;
    this.streamOnTranscript = onTranscriptDelta;
    this.streamOnError = onError ?? null;

    // Step 1: Fetch an ephemeral token from our edge function.
    // The real OpenAI API key stays server-side; the app only gets a 60-second token.
    let ephemeralToken: string;
    try {
      const tokenResp = await supabase.functions.invoke('realtime-transcribe');
      if (tokenResp.error || !tokenResp.data?.client_secret?.value) {
        console.warn('[EmergencyAlert] Failed to get ephemeral token:', tokenResp.error);
        this._activateHttpFallback(onAutoStop, onError);
        return;
      }
      ephemeralToken = tokenResp.data.client_secret.value;
      console.log('[EmergencyAlert] Got ephemeral token, connecting to OpenAI...');
    } catch (err) {
      console.warn('[EmergencyAlert] Ephemeral token fetch failed:', err);
      this._activateHttpFallback(onAutoStop, onError);
      return;
    }

    // Step 2: Connect directly to OpenAI Realtime API with the ephemeral token.
    // React Native's WebSocket supports a 3rd {headers} argument (unlike browser
    // WebSocket) — the native iOS layer passes these headers in the HTTP upgrade
    // request, so Authorization: Bearer reaches OpenAI correctly.
    const openaiWsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';
    console.log('[EmergencyAlert] Connecting streaming WebSocket directly to OpenAI');
    const ws = new WebSocket(openaiWsUrl, ['realtime'], {
      headers: {
        Authorization: `Bearer ${ephemeralToken}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    } as any);
    this.streamWs = ws;

    // Fallback: if no transcript arrives within 8s, the streaming path is
    // broken (bad WebSocket, OpenAI error, etc.) — automatically switch to
    // the reliable HTTP chunked Whisper path so the medic is never silent.
    const STREAMING_FALLBACK_MS = 8_000;
    this.streamHasTranscript = false;
    this.streamFallbackTimer = setTimeout(() => {
      if (!this.streamHasTranscript && this.streamActive) {
        console.warn('[EmergencyAlert] Streaming produced no transcript in 8s — falling back to HTTP chunks');
        this._activateHttpFallback(onAutoStop, onError);
      }
    }, STREAMING_FALLBACK_MS);

    ws.onopen = () => {
      console.log('[EmergencyAlert] Streaming WS open — connected to OpenAI Realtime API');
      // The session was pre-configured by the edge function (server VAD, whisper-1,
      // transcription-only). No further session.update needed — just start streaming audio.
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        switch (msg.type) {
          case 'conversation.item.input_audio_transcription.delta':
            this.streamHasTranscript = true;
            if (this.streamFallbackTimer) {
              clearTimeout(this.streamFallbackTimer);
              this.streamFallbackTimer = null;
            }
            if (msg.delta) this.streamOnTranscript?.(msg.delta);
            break;
          case 'conversation.item.input_audio_transcription.completed':
            this.streamHasTranscript = true;
            if (this.streamFallbackTimer) {
              clearTimeout(this.streamFallbackTimer);
              this.streamFallbackTimer = null;
            }
            break;
          case 'error':
            console.warn('[EmergencyAlert] Streaming error from OpenAI:', msg.error?.message);
            this.streamOnError?.();
            break;
        }
      } catch (_) {}
    };

    ws.onerror = (e) => {
      console.warn('[EmergencyAlert] Streaming WS error — activating fallback');
      this._activateHttpFallback(onAutoStop, onError);
    };

    ws.onclose = () => {
      console.log('[EmergencyAlert] Streaming WS closed');
      // If the WS closes before we ever got a transcript AND we're still
      // recording, activate fallback (handles server-side close/rejection).
      if (this.streamActive && !this.streamHasTranscript) {
        this._activateHttpFallback(onAutoStop, onError);
      }
    };

    // Start recording and rotation
    await this._startPcmChunk();

    this.stopRecordingTimeout = setTimeout(() => {
      console.log('[EmergencyAlert] Streaming auto-stop at 90s');
      onAutoStop();
    }, MAX_RECORDING_DURATION_MS);

    this.rotationInterval = setInterval(async () => {
      if (!this.streamActive || !this.recording) return;
      try {
        const done = this.recording;
        this.recording = null;
        await done.stopAndUnloadAsync();
        const uri = done.getURI();
        await this._startPcmChunk();
        if (uri) this._sendPcmChunk(uri);
      } catch (err) {
        console.warn('[EmergencyAlert] Streaming rotation error:', err);
      }
    }, STREAMING_CHUNK_INTERVAL_MS);
  }

  /** Create a new PCM recording instance. */
  private async _startPcmChunk(): Promise<void> {
    const { recording } = await Audio.Recording.createAsync(PCM_RECORDING_OPTIONS);
    this.recording = recording;
  }

  /**
   * Read a completed WAV file, strip the 44-byte header to extract raw PCM16,
   * and send it to the edge function WebSocket.
   */
  private async _sendPcmChunk(uri: string): Promise<void> {
    if (!this.streamWs || this.streamWs.readyState !== WebSocket.OPEN) return;
    if (!FileSystem) return;
    try {
      const b64File = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

      // Decode → strip 44-byte WAV header → re-encode as base64 PCM16
      const raw = atob(b64File);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      // Find the "data" chunk dynamically (handles non-standard WAV headers)
      const dataOffset = this._wavDataOffset(bytes);
      const pcm = bytes.slice(dataOffset);
      if (pcm.length === 0) return;

      let bin = '';
      for (let i = 0; i < pcm.length; i++) bin += String.fromCharCode(pcm[i]);

      // Connecting directly to OpenAI — use the native input_audio_buffer.append event
      this.streamWs.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: btoa(bin) }));
    } catch (err) {
      console.warn('[EmergencyAlert] PCM chunk send failed:', err);
    }
  }

  /** Parse a RIFF/WAV header to find the byte offset of the "data" chunk payload. */
  private _wavDataOffset(bytes: Uint8Array): number {
    if (bytes.length < 12) return 44;
    let offset = 12; // skip "RIFF" + fileSize + "WAVE"
    while (offset + 8 <= bytes.length) {
      const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      const size =
        bytes[offset + 4] |
        (bytes[offset + 5] << 8) |
        (bytes[offset + 6] << 16) |
        (bytes[offset + 7] << 24);
      if (id === 'data') return offset + 8;
      offset += 8 + size + (size % 2); // align to even bytes
    }
    return 44; // fallback
  }

  /**
   * Tear down the streaming WebSocket and PCM recording, switch to the standard
   * HTTP chunked Whisper path. Called automatically if streaming stalls.
   */
  private _activateHttpFallback(
    onAutoStop: () => void,
    onError?: () => void,
  ): void {
    // Avoid re-entrant fallback calls
    if (!this.streamActive || this._streamUsedHttpFallback) return;
    this._streamUsedHttpFallback = true;

    // Cancel the fallback timer if still pending
    if (this.streamFallbackTimer) {
      clearTimeout(this.streamFallbackTimer);
      this.streamFallbackTimer = null;
    }

    // Tear down PCM recording / rotation
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
    if (this.stopRecordingTimeout) {
      clearTimeout(this.stopRecordingTimeout);
      this.stopRecordingTimeout = null;
    }
    if (this.recording) {
      this.recording.stopAndUnloadAsync().catch(() => {});
      this.recording = null;
    }

    // Close the WebSocket without triggering the onclose fallback loop
    if (this.streamWs) {
      this.streamWs.onclose = null;
      this.streamWs.onerror = null;
      if (this.streamWs.readyState === WebSocket.OPEN) this.streamWs.close();
      this.streamWs = null;
    }

    // Re-use the existing HTTP chunked path — pass through the delta callback
    const deltaCallback = this.streamOnTranscript;
    this.streamOnTranscript = null;
    this.streamOnError = null;

    if (!deltaCallback) return;

    console.log('[EmergencyAlert] Switching to HTTP Whisper fallback path');
    // startRecording takes a full-chunk callback (not delta), so wrap to append
    this.startRecording(
      (chunk) => deltaCallback(chunk + ' '),
      onAutoStop,
      onError,
    ).catch((err) => {
      console.warn('[EmergencyAlert] HTTP fallback startRecording failed:', err);
      onError?.();
    });
  }

  /**
   * Stop streaming transcription and return the URI of the final audio chunk
   * (for optional upload to Supabase Storage).
   *
   * If the session silently fell back to HTTP chunks, this delegates to
   * stopRecording() so the correct cleanup path runs.
   */
  async stopStreamingTranscription(): Promise<string | null> {
    // If we fell back to HTTP chunks mid-session, delegate to stopRecording
    if (this._streamUsedHttpFallback) {
      this.streamActive = false;
      this._streamUsedHttpFallback = false;
      if (this.streamFallbackTimer) {
        clearTimeout(this.streamFallbackTimer);
        this.streamFallbackTimer = null;
      }
      // WebSocket is already closed by _activateHttpFallback
      this.streamWs = null;
      this.streamOnTranscript = null;
      this.streamOnError = null;
      return this.stopRecording();
    }

    this.streamActive = false;
    this._streamUsedHttpFallback = false;

    if (this.streamFallbackTimer) {
      clearTimeout(this.streamFallbackTimer);
      this.streamFallbackTimer = null;
    }

    if (this.stopRecordingTimeout) {
      clearTimeout(this.stopRecordingTimeout);
      this.stopRecordingTimeout = null;
    }
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }

    let uri: string | null = null;
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      uri = this.recording.getURI() || null;
      this.recording = null;
      if (uri) await this._sendPcmChunk(uri);
    }

    if (this.streamWs && this.streamWs.readyState === WebSocket.OPEN) {
      this.streamWs.close();
    }
    this.streamWs = null;
    this.streamOnTranscript = null;
    this.streamOnError = null;

    if (Audio) await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    console.log('[EmergencyAlert] Streaming stopped, final URI:', uri);
    return uri;
  }
}

// Singleton instance following existing service pattern
export const emergencyAlertService = new EmergencyAlertService();
export default emergencyAlertService;
