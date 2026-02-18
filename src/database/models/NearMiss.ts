import { Model } from '@nozbe/watermelondb'
import { field, text, json } from '@nozbe/watermelondb/decorators'

// Sanitizer for photo_uris JSON array - returns empty array if parse fails
const sanitizePhotoUris = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default class NearMiss extends Model {
  static table = 'near_misses'

  @field('server_id') serverId?: string
  @field('org_id') orgId!: string
  @field('reported_by') reportedBy!: string
  @field('category') category!: string
  @field('severity') severity!: string
  @text('description') description!: string
  @field('location') location?: string
  @json('photo_uris', sanitizePhotoUris) photoUris!: string[]
  @field('corrective_action') correctiveAction?: string
  @field('created_at') createdAt!: number
  @field('updated_at') updatedAt!: number
  @field('last_modified_at') lastModifiedAt!: number
  // v4: GPS coordinates for location precision (Phase 18)
  @field('gps_lat') gpsLat?: number
  @field('gps_lng') gpsLng?: number
}
