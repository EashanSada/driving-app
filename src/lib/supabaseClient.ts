import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};

// Direct static access for Vite compile-time env replacement
const rawUrl = metaEnv.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_URL) || '';

const rawKey = metaEnv.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_ANON_KEY) || '';

export const supabaseUrl = rawUrl.trim();
export const supabaseAnonKey = rawKey.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })
  : null;


