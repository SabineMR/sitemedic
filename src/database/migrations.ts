import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'workers',
          columns: [
            { name: 'emergency_contact_relationship', type: 'string', isOptional: true },
            { name: 'allergies', type: 'string', isOptional: true },
            { name: 'current_medications', type: 'string', isOptional: true },
            { name: 'pre_existing_conditions', type: 'string', isOptional: true },
            { name: 'blood_type', type: 'string', isOptional: true },
            { name: 'cscs_card_number', type: 'string', isOptional: true },
            { name: 'cscs_expiry_date', type: 'number', isOptional: true },
            { name: 'certifications', type: 'string', isOptional: true },
            { name: 'is_incomplete', type: 'boolean', isOptional: false },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'audit_log',
          columns: [
            { name: 'user_id', type: 'string' },
            { name: 'table_name', type: 'string' },
            { name: 'record_id', type: 'string' },
            { name: 'operation', type: 'string' },
            { name: 'context', type: 'string', isOptional: true },
            { name: 'synced', type: 'boolean' },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      // v4: Vertical infrastructure schema (Phase 18)
      // - treatments: event_vertical, vertical_extra_fields, booking_id
      // - near_misses: gps_lat, gps_lng
      // All columns isOptional: true — required for safe migration of existing device installs
      toVersion: 4,
      steps: [
        addColumns({
          table: 'treatments',
          columns: [
            { name: 'event_vertical', type: 'string', isOptional: true },
            { name: 'vertical_extra_fields', type: 'string', isOptional: true },
            { name: 'booking_id', type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'near_misses',
          columns: [
            { name: 'gps_lat', type: 'number', isOptional: true },
            { name: 'gps_lng', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      // v5: iOS messaging offline cache tables (Phase 42)
      // - conversations: local cache of org conversations
      // - messages: local cache of messages with offline 'queued' status support
      toVersion: 5,
      steps: [
        createTable({
          name: 'conversations',
          columns: [
            { name: 'server_id', type: 'string', isOptional: true },
            { name: 'org_id', type: 'string', isIndexed: true },
            { name: 'type', type: 'string' },
            { name: 'subject', type: 'string', isOptional: true },
            { name: 'medic_id', type: 'string', isOptional: true },
            { name: 'created_by', type: 'string' },
            { name: 'last_message_at', type: 'number', isOptional: true },
            { name: 'last_message_preview', type: 'string', isOptional: true },
            { name: 'participant_name', type: 'string', isOptional: true },
            { name: 'unread_count', type: 'number' },
            { name: 'last_read_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'messages',
          columns: [
            { name: 'server_id', type: 'string', isOptional: true },
            { name: 'conversation_id', type: 'string', isIndexed: true },
            { name: 'org_id', type: 'string', isIndexed: true },
            { name: 'sender_id', type: 'string' },
            { name: 'sender_name', type: 'string', isOptional: true },
            { name: 'message_type', type: 'string' },
            { name: 'content', type: 'string', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'idempotency_key', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
})
