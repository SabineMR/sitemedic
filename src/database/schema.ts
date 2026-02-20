import { appSchema, tableSchema } from '@nozbe/watermelondb'

// IMPORTANT: When bumping schema version, add a migration adapter before production release.
// For development, clearing app data is acceptable. Production requires proper migrations.
// See: https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html

export const schema = appSchema({
  version: 5,
  tables: [
    tableSchema({
      name: 'treatments',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true }, // Supabase UUID after sync
        { name: 'org_id', type: 'string', isIndexed: true },
        { name: 'worker_id', type: 'string', isIndexed: true },
        { name: 'medic_id', type: 'string' },
        { name: 'reference_number', type: 'string', isIndexed: true }, // SITE-YYYYMMDD-NNN format (TREAT-09)
        { name: 'status', type: 'string' }, // draft/complete (for workflow state)
        { name: 'injury_type', type: 'string' },
        { name: 'body_part', type: 'string', isOptional: true },
        { name: 'mechanism_of_injury', type: 'string', isOptional: true }, // How the injury occurred (TREAT-04)
        { name: 'severity', type: 'string' }, // minor/moderate/major/critical
        { name: 'treatment_types', type: 'string', isOptional: true }, // JSON array of selected treatment IDs (TREAT-05)
        { name: 'treatment_notes', type: 'string', isOptional: true },
        { name: 'outcome', type: 'string', isOptional: true },
        { name: 'is_riddor_reportable', type: 'boolean' },
        { name: 'photo_uris', type: 'string' }, // JSON array stored as string
        { name: 'signature_uri', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' }, // epoch milliseconds
        { name: 'updated_at', type: 'number' },
        { name: 'last_modified_at', type: 'number' }, // for sync conflict resolution
        // v4: vertical infrastructure columns (Phase 18)
        { name: 'event_vertical', type: 'string', isOptional: true },
        { name: 'vertical_extra_fields', type: 'string', isOptional: true }, // raw JSON; parse with JSON.parse() at call site
        { name: 'booking_id', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'workers',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'org_id', type: 'string', isIndexed: true },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'company', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'emergency_contact_name', type: 'string', isOptional: true },
        { name: 'emergency_contact_phone', type: 'string', isOptional: true },
        { name: 'emergency_contact_relationship', type: 'string', isOptional: true },
        { name: 'health_notes', type: 'string', isOptional: true },
        { name: 'allergies', type: 'string', isOptional: true },
        { name: 'current_medications', type: 'string', isOptional: true },
        { name: 'pre_existing_conditions', type: 'string', isOptional: true },
        { name: 'blood_type', type: 'string', isOptional: true },
        { name: 'cscs_card_number', type: 'string', isOptional: true },
        { name: 'cscs_expiry_date', type: 'number', isOptional: true },
        { name: 'certifications', type: 'string', isOptional: true }, // JSON array
        { name: 'is_incomplete', type: 'boolean' },
        { name: 'consent_given', type: 'boolean' },
        { name: 'consent_date', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_modified_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'near_misses',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'org_id', type: 'string', isIndexed: true },
        { name: 'reported_by', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'severity', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'photo_uris', type: 'string' },
        { name: 'corrective_action', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_modified_at', type: 'number' },
        // v4: GPS coordinates for location precision (Phase 18)
        { name: 'gps_lat', type: 'number', isOptional: true },
        { name: 'gps_lng', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'safety_checks',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'org_id', type: 'string', isIndexed: true },
        { name: 'medic_id', type: 'string' },
        { name: 'check_date', type: 'number' }, // epoch for the date
        { name: 'items', type: 'string' }, // JSON stringified array
        { name: 'overall_status', type: 'string' }, // pass/fail/partial
        { name: 'photo_uris', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_modified_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'operation', type: 'string' }, // create/update/delete
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' }, // local WatermelonDB ID
        { name: 'idempotency_key', type: 'string' }, // client-generated UUID for duplicate detection
        { name: 'payload', type: 'string' }, // JSON stringified
        { name: 'priority', type: 'number' }, // 0 = immediate (RIDDOR), 1 = normal
        { name: 'retry_count', type: 'number' },
        { name: 'next_retry_at', type: 'number' }, // epoch milliseconds
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'audit_log',
      columns: [
        { name: 'user_id', type: 'string' }, // authenticated user's Supabase UUID
        { name: 'table_name', type: 'string' }, // which table was accessed
        { name: 'record_id', type: 'string' }, // WatermelonDB ID of the accessed record
        { name: 'operation', type: 'string' }, // 'READ', 'CREATE', 'UPDATE', 'DELETE'
        { name: 'context', type: 'string', isOptional: true }, // why the access happened
        { name: 'synced', type: 'boolean' }, // false until synced to Supabase audit_logs table
        { name: 'created_at', type: 'number' }, // epoch milliseconds
      ],
    }),
    // v5: iOS messaging offline cache (Phase 42)
    tableSchema({
      name: 'conversations',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true }, // Supabase UUID, populated after sync
        { name: 'org_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' }, // 'direct' | 'broadcast'
        { name: 'subject', type: 'string', isOptional: true }, // for broadcast conversations
        { name: 'medic_id', type: 'string', isOptional: true }, // for direct conversations
        { name: 'created_by', type: 'string' }, // user who created the conversation
        { name: 'last_message_at', type: 'number', isOptional: true }, // epoch ms of last message
        { name: 'last_message_preview', type: 'string', isOptional: true }, // truncated last message content
        { name: 'participant_name', type: 'string', isOptional: true }, // denormalized name for display
        { name: 'unread_count', type: 'number' }, // locally computed unread count (default 0)
        { name: 'last_read_at', type: 'number', isOptional: true }, // epoch ms of current user's last read
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'messages',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true }, // Supabase UUID
        { name: 'conversation_id', type: 'string', isIndexed: true }, // links to local conversation
        { name: 'org_id', type: 'string', isIndexed: true },
        { name: 'sender_id', type: 'string' }, // Supabase user UUID of sender
        { name: 'sender_name', type: 'string', isOptional: true }, // denormalized sender display name
        { name: 'message_type', type: 'string' }, // 'text' | 'attachment' | 'system'
        { name: 'content', type: 'string', isOptional: true }, // message text
        { name: 'status', type: 'string' }, // 'queued' | 'sent' | 'delivered' | 'read'
        { name: 'idempotency_key', type: 'string', isOptional: true }, // client-generated UUID for deduplication
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
})
