/**
 * realtime-transcribe Edge Function
 *
 * Issues a short-lived OpenAI Realtime API ephemeral session token so the
 * app can connect DIRECTLY to OpenAI without proxying through the edge
 * function. The real API key never leaves this function.
 *
 * Flow:
 *   1. App calls GET /functions/v1/realtime-transcribe
 *   2. Function POSTs to https://api.openai.com/v1/realtime/sessions
 *   3. Returns { client_secret: { value: "eph-..." }, session_id: "..." }
 *   4. App opens wss://api.openai.com/v1/realtime?model=... directly
 *      using Authorization: Bearer eph-... (ephemeral key expires in 60s)
 *   5. App configures the session, streams audio, receives transcript events.
 *
 * WHY ephemeral tokens instead of a WebSocket proxy:
 *   The local supabase-edge-runtime sandbox strips custom headers from
 *   outgoing WebSocket connections (the Authorization header never reaches
 *   OpenAI). Ephemeral tokens sidestep this completely — the proxy hop is
 *   eliminated and the real API key stays server-side.
 */

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = 'gpt-4o-realtime-preview';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Create a short-lived ephemeral session token via OpenAI REST API.
    // The token expires after 60 seconds — enough time to open the WebSocket.
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        // Transcription-only: server VAD detects speech, no model response.
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
          create_response: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[realtime-transcribe] OpenAI session creation failed:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create OpenAI session', detail: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const session = await response.json();
    console.log('[realtime-transcribe] Ephemeral session created:', session.id);

    return new Response(JSON.stringify(session), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[realtime-transcribe] Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
