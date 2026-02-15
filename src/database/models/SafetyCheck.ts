import { Model } from '@nozbe/watermelondb'
import { field, json } from '@nozbe/watermelondb/decorators'

// Sanitizer for photo_uris JSON array - returns empty array if parse fails
const sanitizePhotoUris = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Sanitizer for checklist items JSON array - returns empty array if parse fails
const sanitizeItems = (raw: string): any[] => {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default class SafetyCheck extends Model {
  static table = 'safety_checks'

  @field('server_id') serverId?: string
  @field('org_id') orgId!: string
  @field('medic_id') medicId!: string
  @field('check_date') checkDate!: number
  @json('items', sanitizeItems) items!: any[]
  @field('overall_status') overallStatus!: string // pass/fail/partial
  @json('photo_uris', sanitizePhotoUris) photoUris!: string[]
  @field('created_at') createdAt!: number
  @field('updated_at') updatedAt!: number
  @field('last_modified_at') lastModifiedAt!: number
}
