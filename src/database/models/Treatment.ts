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

// Sanitizer for treatment_types JSON array - returns empty array if parse fails
const sanitizeTreatmentTypes = (raw: string): string[] => {
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
  @field('reference_number') referenceNumber!: string
  @field('status') status!: string // draft | complete
  @field('injury_type') injuryType!: string
  @field('body_part') bodyPart?: string
  @text('mechanism_of_injury') mechanismOfInjury?: string
  @field('severity') severity!: string
  @json('treatment_types', sanitizeTreatmentTypes) treatmentTypes!: string[]
  @text('treatment_notes') treatmentNotes?: string
  @text('outcome') outcome?: string
  @field('is_riddor_reportable') isRiddorReportable!: boolean
  @json('photo_uris', sanitizePhotoUris) photoUris!: string[]
  @field('signature_uri') signatureUri?: string
  @field('created_at') createdAt!: number
  @field('updated_at') updatedAt!: number
  @field('last_modified_at') lastModifiedAt!: number
  // v4: vertical infrastructure fields (Phase 18)
  @field('event_vertical') eventVertical?: string
  @text('vertical_extra_fields') verticalExtraFields?: string // raw JSON; parse with JSON.parse() at call site
  @field('booking_id') bookingId?: string
}
