import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'treatments',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true }, // Supabase UUID after sync
        { name: 'org_id', type: 'string', isIndexed: true },
        { name: 'worker_id', type: 'string', isIndexed: true },
        { name: 'medic_id', type: 'string' },
        { name: 'injury_type', type: 'string' },
        { name: 'body_part', type: 'string' },
        { name: 'severity', type: 'string' }, // minor/moderate/major/critical
        { name: 'treatment_notes', type: 'string' },
        { name: 'outcome', type: 'string' },
        { name: 'is_riddor_reportable', type: 'boolean' },
        { name: 'photo_uris', type: 'string' }, // JSON array stored as string
        { name: 'signature_uri', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' }, // epoch milliseconds
        { name: 'updated_at', type: 'number' },
        { name: 'last_modified_at', type: 'number' }, // for sync conflict resolution
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
        { name: 'health_notes', type: 'string', isOptional: true },
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
  ],
})
