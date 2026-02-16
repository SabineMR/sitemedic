import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'

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
  ],
})
