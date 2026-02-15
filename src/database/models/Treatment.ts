import { Model, Q } from '@nozbe/watermelondb'
import { field, date, readonly, text, json, relation } from '@nozbe/watermelondb/decorators'
import { Associations } from '@nozbe/watermelondb/Model'

// Sanitizer for photo_uris JSON array - returns empty array if parse fails
const sanitizePhotoUris = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default class Treatment extends Model {
  static table = 'treatments'

  static associations: Associations = {
    workers: { type: 'belongs_to', key: 'worker_id' },
  }

  @field('server_id') serverId?: string
  @field('org_id') orgId!: string
  @field('worker_id') workerId!: string
  @field('medic_id') medicId!: string
  @field('injury_type') injuryType!: string
  @field('body_part') bodyPart!: string
  @field('severity') severity!: string
  @text('treatment_notes') treatmentNotes!: string
  @text('outcome') outcome!: string
  @field('is_riddor_reportable') isRiddorReportable!: boolean
  @json('photo_uris', sanitizePhotoUris) photoUris!: string[]
  @field('signature_uri') signatureUri?: string
  @field('created_at') createdAt!: number
  @field('updated_at') updatedAt!: number
  @field('last_modified_at') lastModifiedAt!: number
}
