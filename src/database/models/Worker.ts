import { Model, Q, Query } from '@nozbe/watermelondb'
import { field, lazy } from '@nozbe/watermelondb/decorators'
import { Associations } from '@nozbe/watermelondb/Model'
import Treatment from './Treatment'

export default class Worker extends Model {
  static table = 'workers'

  static associations: Associations = {
    treatments: { type: 'has_many', foreignKey: 'worker_id' },
  }

  @field('server_id') serverId?: string
  @field('org_id') orgId!: string
  @field('first_name') firstName!: string
  @field('last_name') lastName!: string
  @field('company') company!: string
  @field('role') role!: string
  @field('phone') phone?: string
  @field('emergency_contact_name') emergencyContactName?: string
  @field('emergency_contact_phone') emergencyContactPhone?: string
  @field('health_notes') healthNotes?: string
  @field('allergies') allergies?: string
  @field('current_medications') currentMedications?: string
  @field('pre_existing_conditions') preExistingConditions?: string
  @field('blood_type') bloodType?: string
  @field('cscs_card_number') cscsCardNumber?: string
  @field('cscs_expiry_date') cscsExpiryDate?: number
  @field('certifications') certifications?: string // JSON array: [{type: string, expiry: number}]
  @field('emergency_contact_relationship') emergencyContactRelationship?: string
  @field('is_incomplete') isIncomplete!: boolean // True if created via quick-add
  @field('consent_given') consentGiven!: boolean
  @field('consent_date') consentDate?: number
  @field('created_at') createdAt!: number
  @field('updated_at') updatedAt!: number
  @field('last_modified_at') lastModifiedAt!: number

  @lazy treatments = this.collections
    .get<Treatment>('treatments')
    .query(Q.where('worker_id', this.id))
}
