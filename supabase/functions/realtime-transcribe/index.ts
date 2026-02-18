/**
 * realtime-transcribe Edge Function
 *
 * WebSocket proxy between the SiteMedic app and the OpenAI Realtime API.
 *
 * Flow:
 *   1. App opens a WebSocket to this function.
 *   2. Function opens a WebSocket to OpenAI Realtime API.
 *   3. Session is configured for transcription-only (server VAD, no response).
 *   4. App sends  { type: "audio", data: "<base64 PCM16 @ 24kHz mono>" }
 *   5. Function forwards each chunk to OpenAI's input_audio_buffer.append.
 *   6. OpenAI streams back transcript events (delta + completed).
 *   7. Function forwards them to the app as:
 *        { type: "transcript_delta", delta: "Hello " }
 *        { type: "transcript_done",  transcript: "Hello world." }
 *   8. App closes WebSocket when recording ends.
 *
 * Audio format required by app:
 *   PCM16, 24 000 Hz, 1 channel, little-endian, no WAV header.
 *   (The service strips the 44-byte WAV header before sending.)
 */

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
// Use the stable snapshot to avoid unexpected behaviour from rolling model updates.
const OPENAI_REALTIME_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Upgrade, Connection',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!OPENAI_API_KEY) {
    return new Response('OPENAI_API_KEY not configured', { status: 500 });
  }

  const upgrade = req.headers.get('upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return new Response('WebSocket upgrade required.', { status: 426, headers: corsHeaders });
  }

  // ── Upgrade the app connection ────────────────────────────────────────────
  const { socket: appWs, response } = Deno.upgradeWebSocket(req);

  // ── Open connection to OpenAI Realtime API ────────────────────────────────
  // Deno v2 supports a 3rd-arg options object with `headers` for WebSocket clients.
  const openaiWs = new WebSocket(OPENAI_REALTIME_URL, ['realtime'], {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  } as any);

  let openaiReady = false;
  const pendingAudio: string[] = []; // chunks buffered before OpenAI is ready

  // ── OpenAI → App ──────────────────────────────────────────────────────────
  openaiWs.onopen = () => {
    openaiReady = true;
    console.log('[Realtime] OpenAI WebSocket connected');

    // Transcription-only session: server VAD, no model response generated.
    openaiWs.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text'],
          input_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 200,
            silence_duration_ms: 400,
          },
          // Prevent the model from generating spoken/text responses.
          instructions: 'You are a transcription-only assistant. Never respond.',
          max_response_output_tokens: 0,
        },
      }),
    );

    // Flush audio buffered while OpenAI was connecting
    for (const chunk of pendingAudio) {
      openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: chunk }));
    }
    pendingAudio.length = 0;
  };

  openaiWs.onmessage = (ev) => {
    if (appWs.readyState !== WebSocket.OPEN) return;
    try {
      const msg = JSON.parse(ev.data as string);
      switch (msg.type) {
        case 'conversation.item.input_audio_transcription.delta':
          // Word-by-word delta — send immediately so the UI feels real-time
          appWs.send(JSON.stringify({ type: 'transcript_delta', delta: msg.delta ?? '' }));
          break;
        case 'conversation.item.input_audio_transcription.completed':
          appWs.send(
            JSON.stringify({ type: 'transcript_done', transcript: msg.transcript ?? '' }),
          );
          break;
        case 'input_audio_buffer.speech_started':
          appWs.send(JSON.stringify({ type: 'speech_started' }));
          break;
        case 'input_audio_buffer.speech_stopped':
          appWs.send(JSON.stringify({ type: 'speech_stopped' }));
          break;
        case 'error':
          console.error('[Realtime] OpenAI error:', msg.error);
          appWs.send(
            JSON.stringify({ type: 'error', message: msg.error?.message ?? 'OpenAI error' }),
          );
          break;
      }
    } catch (e) {
      console.error('[Realtime] Parse error:', e);
    }
  };

  openaiWs.onerror = (e) => {
    console.error('[Realtime] OpenAI WS error:', e);
    if (appWs.readyState === WebSocket.OPEN) {
      appWs.send(JSON.stringify({ type: 'error', message: 'OpenAI connection failed' }));
      appWs.close();
    }
  };

  openaiWs.onclose = () => {
    if (appWs.readyState === WebSocket.OPEN) appWs.close();
  };

  // ── App → OpenAI ──────────────────────────────────────────────────────────
  appWs.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string);
      if (msg.type === 'audio' && msg.data) {
        if (!openaiReady) {
          // Buffer until OpenAI is ready
          pendingAudio.push(msg.data);
        } else if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(
            JSON.stringify({ type: 'input_audio_buffer.append', audio: msg.data }),
          );
        }
      }
    } catch (e) {
      console.error('[Realtime] App message parse error:', e);
    }
  };

  appWs.onclose = () => {
    if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close();
  };

  appWs.onerror = (e) => {
    console.error('[Realtime] App WS error:', e);
    if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close();
  };

  return response;
});
