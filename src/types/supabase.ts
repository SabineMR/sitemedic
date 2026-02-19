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
          push_token: string | null;
          push_token_updated_at: string | null;
          is_active: boolean;
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
          push_token?: string | null;
          push_token_updated_at?: string | null;
          is_active?: boolean;
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
          push_token?: string | null;
          push_token_updated_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      emergency_contacts: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          phone: string;
          email: string | null;
          push_token: string | null;
          role: string | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          phone: string;
          email?: string | null;
          push_token?: string | null;
          role?: string | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          phone?: string;
          email?: string | null;
          push_token?: string | null;
          role?: string | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      emergency_alerts: {
        Row: {
          id: string;
          org_id: string | null;
          sent_by: string | null;
          booking_id: string | null;
          contact_id: string | null;
          message_type: 'voice' | 'text';
          text_message: string | null;
          audio_url: string | null;
          push_sent_at: string | null;
          sms_sent_at: string | null;
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          sent_by?: string | null;
          booking_id?: string | null;
          contact_id?: string | null;
          message_type: 'voice' | 'text';
          text_message?: string | null;
          audio_url?: string | null;
          push_sent_at?: string | null;
          sms_sent_at?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          sent_by?: string | null;
          booking_id?: string | null;
          contact_id?: string | null;
          message_type?: 'voice' | 'text';
          text_message?: string | null;
          audio_url?: string | null;
          push_sent_at?: string | null;
          sms_sent_at?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
