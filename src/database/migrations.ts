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
  ],
})
