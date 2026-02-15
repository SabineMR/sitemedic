/**
 * Supabase Database Types
 * 
 * This file will be auto-generated from Supabase schema in Phase 1, Plan 02.
 * For now, it provides the base type structure for TypeScript support.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {}
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
