-- Migration 150: Message Push Notification Trigger (Phase 43-03)
-- Creates an AFTER INSERT trigger on messages table that invokes the
-- send-message-notification Edge Function via pg_net for async push delivery.
--
-- GDPR-safe: The Edge Function receives only message_id, conversation_id,
-- sender_id, and org_id. Message content is NEVER included in the trigger payload.
--
-- Non-blocking: Uses pg_net (async HTTP) so message INSERT is not delayed.
--
-- Dependencies:
--   - Edge Function: send-message-notification (Phase 43-03)
--   - Table: messages (migration 143)
--   - Vault secrets: project_url, service_role_key
--
-- NOTE: No schema changes -- this migration ONLY adds a trigger function and trigger.

-- =============================================================================
-- 1. Enable pg_net extension (idempotent)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- 2. Drop existing trigger/function if they exist (migration idempotency)
-- =============================================================================

DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;

-- =============================================================================
-- 3. Create trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_project_url text;
  v_service_role_key text;
BEGIN
  -- Retrieve secrets from Vault (same pattern as migration 033)
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';

  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Call send-message-notification Edge Function asynchronously via pg_net
  -- Non-blocking: Does NOT delay the message INSERT transaction
  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/send-message-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'org_id', NEW.org_id
    )
  );

  -- Return NEW (does not modify the message row)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. Create the trigger
-- =============================================================================

CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- =============================================================================
-- 5. Documentation
-- =============================================================================

COMMENT ON TRIGGER on_message_insert_notify ON public.messages IS
  'Phase 43: Fires Edge Function to send push notification on new message. GDPR-safe (sender name only).';

COMMENT ON FUNCTION public.notify_new_message() IS
  'Phase 43: Trigger function that calls send-message-notification Edge Function via pg_net. Passes message_id, conversation_id, sender_id, org_id. Never passes message content.';

-- =============================================================================
-- SUMMARY
-- Trigger function: notify_new_message()
-- Trigger: on_message_insert_notify (AFTER INSERT ON messages, FOR EACH ROW)
-- Pattern: Vault secrets + pg_net async HTTP (same as migration 033)
-- Schema changes: NONE (trigger + function only)
-- =============================================================================
