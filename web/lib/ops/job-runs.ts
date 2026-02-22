import type { SupabaseClient } from '@supabase/supabase-js';

export async function startJobRun(params: {
  supabase: SupabaseClient;
  jobName: string;
  triggerType?: 'cron' | 'manual';
  metadata?: Record<string, unknown>;
}) {
  const { supabase, jobName, triggerType = 'cron', metadata = {} } = params;
  const startedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('marketplace_job_runs')
    .insert({
      job_name: jobName,
      trigger_type: triggerType,
      status: 'started',
      started_at: startedAt,
      metadata,
    })
    .select('id, started_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create job run');
  }

  return { id: data.id as string, startedAt: data.started_at as string };
}

export async function completeJobRun(params: {
  supabase: SupabaseClient;
  runId: string;
  startedAt: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, runId, startedAt, metadata = {} } = params;
  const finishedAt = new Date().toISOString();
  const durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());

  const { error } = await supabase
    .from('marketplace_job_runs')
    .update({
      status: 'completed',
      finished_at: finishedAt,
      duration_ms: durationMs,
      metadata,
    })
    .eq('id', runId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function failJobRun(params: {
  supabase: SupabaseClient;
  runId: string;
  startedAt: string;
  errorMessage: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, runId, startedAt, errorMessage, metadata = {} } = params;
  const finishedAt = new Date().toISOString();
  const durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());

  const { error } = await supabase
    .from('marketplace_job_runs')
    .update({
      status: 'failed',
      finished_at: finishedAt,
      duration_ms: durationMs,
      error_message: errorMessage,
      metadata,
    })
    .eq('id', runId);

  if (error) {
    throw new Error(error.message);
  }
}
