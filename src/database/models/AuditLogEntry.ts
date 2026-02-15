import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export default class AuditLogEntry extends Model {
  static table = 'audit_log'

  @field('user_id') userId!: string // authenticated user's Supabase UUID
  @field('table_name') tableName!: string // which table was accessed (e.g., 'workers', 'treatments')
  @field('record_id') recordId!: string // WatermelonDB ID of the accessed record
  @field('operation') operation!: string // 'READ', 'CREATE', 'UPDATE', 'DELETE'
  @field('context') context!: string // why the access happened (e.g., 'worker_profile_view', 'treatment_history', 'emergency_lookup')
  @field('synced') synced!: boolean // false until synced to Supabase audit_logs table
  @field('created_at') createdAt!: number // epoch milliseconds
}
