import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access compile-time Vite environment variables statically for Vite AST replacement
const VITE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  '';

const VITE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  '';

export function getSupabaseUrl(): string {
  if (VITE_URL && VITE_URL.trim()) return VITE_URL.trim();
  if (typeof window !== 'undefined') {
    const saved =
      localStorage.getItem('VITE_SUPABASE_URL') ||
      localStorage.getItem('DRIVESAFE_SUPABASE_URL') ||
      (window as any).VITE_SUPABASE_URL;
    if (saved && typeof saved === 'string' && saved.trim()) return saved.trim();
  }
  return '';
}

export function getSupabaseAnonKey(): string {
  if (VITE_KEY && VITE_KEY.trim()) return VITE_KEY.trim();
  if (typeof window !== 'undefined') {
    const saved =
      localStorage.getItem('VITE_SUPABASE_ANON_KEY') ||
      localStorage.getItem('DRIVESAFE_SUPABASE_ANON_KEY') ||
      (window as any).VITE_SUPABASE_ANON_KEY;
    if (saved && typeof saved === 'string' && saved.trim()) return saved.trim();
  }
  return '';
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function saveSupabaseConfig(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();
    localStorage.setItem('VITE_SUPABASE_URL', cleanUrl);
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', cleanKey);
    localStorage.setItem('DRIVESAFE_SUPABASE_URL', cleanUrl);
    localStorage.setItem('DRIVESAFE_SUPABASE_ANON_KEY', cleanKey);
    (window as any).VITE_SUPABASE_URL = cleanUrl;
    (window as any).VITE_SUPABASE_ANON_KEY = cleanKey;
  }
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('VITE_SUPABASE_URL');
    localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
    localStorage.removeItem('DRIVESAFE_SUPABASE_URL');
    localStorage.removeItem('DRIVESAFE_SUPABASE_ANON_KEY');
    delete (window as any).VITE_SUPABASE_URL;
    delete (window as any).VITE_SUPABASE_ANON_KEY;
  }
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    cachedClient = null;
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedUrl = url;
    cachedKey = key;
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to instantiate Supabase client:', err);
    return null;
  }
}

// Backward compatibility exports
export const supabaseUrl = getSupabaseUrl();
export const supabaseAnonKey = getSupabaseAnonKey();
export const supabase = getSupabaseClient();

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL or Anon Key is missing. Please configure credentials.'
    };
  }

  try {
    // Attempt simple query on driver_accounts table
    const { error } = await client.from('driver_accounts').select('username').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Connected to Supabase, but "driver_accounts" table does not exist. Please run schema.sql.'
        };
      }
      return {
        success: false,
        message: `Database Query Notice: ${error.message}`
      };
    }
    return {
      success: true,
      message: 'Connected to Supabase Cloud Database successfully! Real-time sync is active.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Connection test failed.'
    };
  }
}



