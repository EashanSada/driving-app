/**
 * RadianDrive iOS - Centralized Supabase Cloud Configuration
 * 
 * This is the central database configuration for your RadianDrive organization.
 * End users (drivers, teens, and parents) NEVER see or enter database keys.
 * 
 * When you build and distribute the app, these credentials connect every user's
 * device directly to your centralized database so all trips, accounts, and hazards
 * are collected into your organization's records.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  // Put your Organization's Supabase Project URL here (e.g. "https://abcdefghijklmnopqrst.supabase.co")
  url: 'https://mhgfbqpodqcksdxapiiv.supabase.co',
  
  // Put your Organization's Supabase Public Anon Key here (e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZ2ZicXBvZHFja3NkeGFwaWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzI5OTIsImV4cCI6MjEwMTAwODk5Mn0.eA2QnhbYxBnVqwBF0vP8cexLKFRFDOO3m54rdteN_m0'
};
