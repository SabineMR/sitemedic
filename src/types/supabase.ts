/**
 * Supabase Database Types
 *
 * Partial types added manually for Phase 1, Plan 04 (auth-manager needs profiles table).
 * TODO: Replace with full auto-generated types via `supabase gen types typescript`
 * after migrations are applied to Supabase project.
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
    Tables: {
      profiles: {
        Row: {
          id: string;
          org_id: string;
          role: 'medic' | 'site_manager' | 'admin';
          full_name: string;
          email: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          role?: 'medic' | 'site_manager' | 'admin';
          full_name: string;
          email: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          role?: 'medic' | 'site_manager' | 'admin';
          full_name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
