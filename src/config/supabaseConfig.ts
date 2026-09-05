/**
 * RadianDrive iOS - Supabase Cloud Configuration
 * 
 * Since RadianDrive runs as a pure native iOS app without a Node.js / Vercel server,
 * it connects directly to your Supabase PostgreSQL cloud database using the Supabase JS SDK.
 * 
 * You can set your credentials here, or in a .env file (VITE_SUPABASE_URL),
 * or directly inside the app on your phone via the "Database & Sync" modal.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  // Put your Supabase Project URL here (e.g. "https://abcdefghijklmnopqrst.supabase.co")
  url: '',
  
  // Put your Supabase Public Anon Key here (e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
  anonKey: ''
};
