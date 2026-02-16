import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export default class SyncQueueItem extends Model {
  static table = 'sync_queue'

  @field('operation') operation!: 'create' | 'update' | 'delete'
  @field('table_name') tableName!: string
  @field('record_id') recordId!: string // Local WatermelonDB ID
  @field('idempotency_key') idempotencyKey!: string // Client-generated UUID for duplicate detection
  @text('payload') payload!: string // JSON stringified data
  @field('priority') priority!: number // 0 = immediate (RIDDOR), 1 = normal
  @field('retry_count') retryCount!: number
  @field('next_retry_at') nextRetryAt!: number // epoch milliseconds
  @field('created_at') createdAt!: number
}
