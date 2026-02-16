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
  ],
})
