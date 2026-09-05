import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_CONFIG } from '../config/supabaseConfig';

// Compile-time environment variables
const ENV_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  '';

const ENV_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  '';

export function getSupabaseUrl(): string {
  // 1. Check in-app local storage first (saved via Settings / DB modal on phone)
  if (typeof window !== 'undefined') {
    const saved =
      localStorage.getItem('VITE_SUPABASE_URL') ||
      localStorage.getItem('DRIVESAFE_SUPABASE_URL') ||
      (window as any).VITE_SUPABASE_URL;
    if (saved && typeof saved === 'string' && saved.trim()) {
      return saved.trim();
    }
  }

  // 2. Check compile-time environment variables
  if (ENV_URL && ENV_URL.trim()) {
    return ENV_URL.trim();
  }

  // 3. Check config file default
  if (DEFAULT_SUPABASE_CONFIG.url && DEFAULT_SUPABASE_CONFIG.url.trim()) {
    return DEFAULT_SUPABASE_CONFIG.url.trim();
  }

  return '';
}

export function getSupabaseAnonKey(): string {
  // 1. Check in-app local storage first
  if (typeof window !== 'undefined') {
    const saved =
      localStorage.getItem('VITE_SUPABASE_ANON_KEY') ||
      localStorage.getItem('DRIVESAFE_SUPABASE_ANON_KEY') ||
      (window as any).VITE_SUPABASE_ANON_KEY;
    if (saved && typeof saved === 'string' && saved.trim()) {
      return saved.trim();
    }
  }

  // 2. Check compile-time environment variables
  if (ENV_KEY && ENV_KEY.trim()) {
    return ENV_KEY.trim();
  }

  // 3. Check config file default
  if (DEFAULT_SUPABASE_CONFIG.anonKey && DEFAULT_SUPABASE_CONFIG.anonKey.trim()) {
    return DEFAULT_SUPABASE_CONFIG.anonKey.trim();
  }

  return '';
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && url.includes('.supabase.co'));
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

    // Invalidate client cache to rebuild with new credentials
    cachedClient = null;
    cachedUrl = '';
    cachedKey = '';
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

    cachedClient = null;
    cachedUrl = '';
    cachedKey = '';
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
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to instantiate direct Supabase iOS client:', err);
    return null;
  }
}

// Backward compatibility exports
export const supabaseUrl = getSupabaseUrl();
export const supabaseAnonKey = getSupabaseAnonKey();
export const supabase = getSupabaseClient();

export interface SupabaseDiagnostics {
  success: boolean;
  message: string;
  hasUrl: boolean;
  hasKey: boolean;
  tableExists?: boolean;
  writePermitted?: boolean;
  details?: string;
}

export async function testSupabaseConnection(): Promise<SupabaseDiagnostics> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return {
      success: false,
      hasUrl: Boolean(url),
      hasKey: Boolean(key),
      message: 'Supabase URL or Anon Key is missing.',
      details: 'Please enter your Supabase Project URL and Anon Key in the fields below.'
    };
  }

  if (!url.startsWith('https://')) {
    return {
      success: false,
      hasUrl: true,
      hasKey: true,
      message: 'Invalid Supabase URL format.',
      details: 'URL must start with https:// and look like https://yourproject.supabase.co'
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      hasUrl: true,
      hasKey: true,
      message: 'Could not create Supabase client instance.',
      details: 'Check that the URL and Key do not contain special control characters.'
    };
  }

  try {
    // 1. Test read on driver_accounts table
    const { data, error } = await client
      .from('driver_accounts')
      .select('username')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          hasUrl: true,
          hasKey: true,
          tableExists: false,
          message: 'Connected to Supabase, but "driver_accounts" table does not exist.',
          details: 'You need to run the SQL in schema.sql in your Supabase SQL Editor to create the tables.'
        };
      }
      if (error.code === '42501' || error.message.includes('row-level security') || error.message.includes('permission denied')) {
        return {
          success: false,
          hasUrl: true,
          hasKey: true,
          tableExists: true,
          message: 'Connected to Supabase, but Row Level Security (RLS) is blocking access.',
          details: 'Run the RLS policy SQL in your Supabase SQL Editor to allow public/anon read & write.'
        };
      }
      return {
        success: false,
        hasUrl: true,
        hasKey: true,
        message: `Supabase query error (${error.code || 'ERR'}): ${error.message}`,
        details: error.details || error.hint || error.message
      };
    }

    return {
      success: true,
      hasUrl: true,
      hasKey: true,
      tableExists: true,
      writePermitted: true,
      message: 'Connected to Supabase Cloud Database successfully!',
      details: 'Real-time database sync is fully active on iOS.'
    };
  } catch (err: any) {
    return {
      success: false,
      hasUrl: true,
      hasKey: true,
      message: err.message || 'Connection test failed.',
      details: 'Check your internet connection and verify that your Supabase project is active.'
    };
  }
}
