import { UnitSystem, UserRole, UserPreferences, StoredTrip, TripBreadcrumb, LanguageCode } from '../types';
import { getSupabaseClient, getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from './supabaseClient';
import { saveTrip } from './offlineTripStore';

export interface TripRecord {
  id: string;
  timestamp: number;
  distanceMiles: number;
  durationSeconds: number;
  safetyScore: number;
  maxSpeedMph: number;
  harshEvents: number;
}

export interface UserAccount {
  username: string;
  fullName: string;
  phone?: string;
  email?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  preferredLanguage?: LanguageCode;
  unitSystem?: UnitSystem;
  role?: UserRole;
  licenseStage?: 'permit' | 'provisional' | 'full';
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  createdTime: number;
  safetyScore: number;
  cleanTrips: number;
  totalTrips: number;
  totalDistanceMiles: number;
  points: number;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  badgesUnlocked: string[];
  tripHistory: TripRecord[];
  preferences?: UserPreferences;
  supervisorCode?: string;
}

const ACTIVE_USER_KEY = 'drivesafe_active_username_v4';
const ACCOUNTS_MAP_KEY = 'drivesafe_accounts_map_v4';
const SYSTEM_PURGE_KEY = 'drivesafe_system_purged_v5';

// Helper to determine speed unit from country
export function getUnitSystemForCountry(countryName: string): UnitSystem {
  const c = (countryName || '').trim().toLowerCase();
  if (
    c.includes('united states') ||
    c.includes('usa') ||
    c === 'us' ||
    c.includes('united kingdom') ||
    c.includes('uk') ||
    c.includes('great britain') ||
    c.includes('liberia') ||
    c.includes('myanmar') ||
    c.includes('burma') ||
    c.includes('bahamas')
  ) {
    return 'imperial';
  }
  return 'metric';
}

// Purge all legacy user and trip data so users start completely fresh
export function purgeAllSystemUserData(): void {
  try {
    // Clear all localStorage keys
    const keepKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    const preserved: Record<string, string> = {};
    keepKeys.forEach(k => {
      const v = localStorage.getItem(k);
      if (v) preserved[k] = v;
    });

    localStorage.clear();

    // Restore preserved config
    Object.keys(preserved).forEach(k => {
      localStorage.setItem(k, preserved[k]);
    });

    // Mark system as purged
    localStorage.setItem(SYSTEM_PURGE_KEY, 'true');

    // Notify backend server to wipe stale cloud accounts if configured
    fetch('/api/accounts', { method: 'DELETE' }).catch(() => {});
  } catch (err) {
    console.error('Purge user data error:', err);
  }
}

// Initialize system purge once on startup
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem(SYSTEM_PURGE_KEY) !== 'true') {
      purgeAllSystemUserData();
    }
  } catch (err) {
    console.warn('Initial purge check notice:', err);
  }
}

export function getActiveUsername(): string | null {
  try {
    return localStorage.getItem(ACTIVE_USER_KEY);
  } catch {
    return null;
  }
}

export function setActiveUsername(username: string): void {
  try {
    const cleanName = username.trim();
    if (!cleanName) return;
    localStorage.setItem(ACTIVE_USER_KEY, cleanName);
  } catch (err) {
    console.error('Failed to set active username:', err);
  }
}

export function clearActiveUsername(): void {
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
  } catch (err) {
    console.error('Failed to clear active username:', err);
  }
}

export function accountExists(username: string): boolean {
  const cleanName = username.trim().toLowerCase();
  if (!cleanName) return false;
  const allMap = getAccountsMap();
  return Boolean(allMap[cleanName]);
}

export function getAllAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_MAP_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw);
    return Object.values(map);
  } catch {
    return [];
  }
}

export function getAccount(username: string): UserAccount | null {
  const cleanName = username.trim();
  if (!cleanName) return null;
  const allMap = getAccountsMap();
  
  if (allMap[cleanName.toLowerCase()]) {
    return allMap[cleanName.toLowerCase()];
  }

  return null;
}

export function createAccount(data: {
  username: string;
  fullName: string;
  phone?: string;
  email?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  preferredLanguage?: LanguageCode;
  unitSystem?: UnitSystem;
  role?: UserRole;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
}): UserAccount {
  const cleanName = data.username.trim();
  const country = data.country?.trim() || 'United States';
  const unitSys = data.unitSystem || getUnitSystemForCountry(country);
  const lang = data.preferredLanguage || 'en';

  const newAccount: UserAccount = {
    username: cleanName,
    fullName: data.fullName.trim() || cleanName,
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    city: data.city?.trim() || '',
    stateProvince: data.stateProvince?.trim() || '',
    country: country,
    preferredLanguage: lang,
    unitSystem: unitSys,
    role: data.role || 'young_driver',
    parentName: data.parentName?.trim() || '',
    parentPhone: data.parentPhone?.trim() || '',
    parentEmail: data.parentEmail?.trim() || '',
    createdTime: Date.now(),
    safetyScore: 100,
    cleanTrips: 0,
    totalTrips: 0,
    totalDistanceMiles: 0,
    points: 0,
    level: 1,
    currentXp: 0,
    nextLevelXp: 1000,
    badgesUnlocked: ['BRONZE_GUARDIAN'],
    tripHistory: [],
    supervisorCode: 'RAD-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
    preferences: {
      audioVoiceAlerts: true,
      audioChimes: true,
      autoTripDetection: true,
      speedLimitWarnings: true,
      offlineSyncEnabled: true,
      role: data.role || 'young_driver',
      gdlEnabled: true
    }
  };

  saveAccount(newAccount);
  setActiveUsername(cleanName);
  return newAccount;
}

export async function fetchAccountFromSupabase(username: string): Promise<UserAccount | null> {
  const cleanName = username.trim();
  if (!cleanName) return null;

  // 1. First try Backend Server Cloud Endpoint for seamless multi-device sync
  try {
    const headers: Record<string, string> = {};
    const clientUrl = getSupabaseUrl();
    const clientKey = getSupabaseAnonKey();
    if (clientUrl) headers['x-supabase-url'] = clientUrl;
    if (clientKey) headers['x-supabase-key'] = clientKey;

    const res = await fetch(`/api/accounts?username=${encodeURIComponent(cleanName)}`, { headers });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.account) {
        const acc: UserAccount = json.account;
        const allMap = getAccountsMap();
        allMap[acc.username.toLowerCase()] = acc;
        localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(allMap));
        return acc;
      }
    }
  } catch (err) {
    console.warn('Backend server account query notice:', err);
  }

  // 2. Secondary: Direct Supabase Client Query
  const client = getSupabaseClient();
  if (client) {
    try {
      const cleanLower = cleanName.toLowerCase();
      
      let { data, error } = await client
        .from('driver_accounts')
        .select('*')
        .eq('username', cleanLower)
        .maybeSingle();

      if (!data) {
        const res = await client
          .from('driver_accounts')
          .select('*')
          .ilike('username', cleanName)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (!error && data) {
        const parsedAccount: UserAccount = data.account_data || {
          username: data.username || cleanName,
          fullName: data.full_name || cleanName,
          phone: data.phone || '',
          email: data.email || '',
          city: data.city || '',
          stateProvince: data.state_province || '',
          country: data.country || '',
          preferredLanguage: data.preferred_language || 'en',
          unitSystem: data.unit_system || 'imperial',
          role: 'young_driver',
          parentName: data.parent_name || '',
          parentPhone: data.parent_phone || '',
          parentEmail: data.parent_email || '',
          createdTime: data.created_time || Date.now(),
          safetyScore: Number(data.safety_score) || 100,
          cleanTrips: Number(data.clean_trips) || 0,
          totalTrips: Number(data.total_trips) || 0,
          totalDistanceMiles: Number(data.total_distance_miles) || 0,
          points: Number(data.points) || 0,
          level: Number(data.level) || 1,
          currentXp: Number(data.current_xp) || 0,
          nextLevelXp: Number(data.next_level_xp) || 1000,
          badgesUnlocked: data.badges_unlocked || ['BRONZE_GUARDIAN'],
          tripHistory: data.trip_history || []
        };

        const allMap = getAccountsMap();
        allMap[parsedAccount.username.toLowerCase()] = parsedAccount;
        localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(allMap));
        return parsedAccount;
      }
    } catch (err) {
      console.warn('Supabase account fetch notice:', err);
    }
  }

  return null;
}

export async function fetchAllAccountsFromSupabase(): Promise<UserAccount[]> {
  const localAccounts = getAllAccounts();

  // 1. Try Server API Endpoint
  try {
    const headers: Record<string, string> = {};
    const clientUrl = getSupabaseUrl();
    const clientKey = getSupabaseAnonKey();
    if (clientUrl) headers['x-supabase-url'] = clientUrl;
    if (clientKey) headers['x-supabase-key'] = clientKey;

    const res = await fetch('/api/accounts', { headers });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.accounts) && json.accounts.length > 0) {
        const accountsMap = getAccountsMap();
        json.accounts.forEach((acc: UserAccount) => {
          if (acc.username) {
            accountsMap[acc.username.toLowerCase()] = acc;
          }
        });
        localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(accountsMap));
        return json.accounts;
      }
    }
  } catch (err) {
    console.warn('Fetch server accounts notice:', err);
  }

  // 2. Direct Supabase Client
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('driver_accounts')
        .select('*')
        .order('safety_score', { ascending: false });

      if (!error && data && data.length > 0) {
        const accountsMap = getAccountsMap();
        
        const cloudAccounts: UserAccount[] = data.map(item => {
          const acc: UserAccount = item.account_data || {
            username: item.username,
            fullName: item.full_name || item.username,
            phone: item.phone || '',
            email: item.email || '',
            city: item.city || '',
            stateProvince: item.state_province || '',
            country: item.country || '',
            preferredLanguage: item.preferred_language || 'en',
            unitSystem: item.unit_system || 'imperial',
            role: 'young_driver',
            parentName: item.parent_name || '',
            parentPhone: item.parent_phone || '',
            parentEmail: item.parent_email || '',
            createdTime: item.created_time || Date.now(),
            safetyScore: Number(item.safety_score) || 100,
            cleanTrips: Number(item.clean_trips) || 0,
            totalTrips: Number(item.total_trips) || 0,
            totalDistanceMiles: Number(item.total_distance_miles) || 0,
            points: Number(item.points) || 0,
            level: Number(item.level) || 1,
            currentXp: Number(item.current_xp) || 0,
            nextLevelXp: Number(item.next_level_xp) || 1000,
            badgesUnlocked: item.badges_unlocked || ['BRONZE_GUARDIAN'],
            tripHistory: item.trip_history || []
          };

          accountsMap[acc.username.toLowerCase()] = acc;
          return acc;
        });

        localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(accountsMap));
        return cloudAccounts;
      }
    } catch (err) {
      console.warn('Fetch all accounts notice:', err);
    }
  }

  return localAccounts;
}

export function saveAccount(account: UserAccount): void {
  try {
    const cleanKey = account.username.toLowerCase();
    const allMap = getAccountsMap();
    allMap[cleanKey] = account;
    localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(allMap));

    // Save to Cloud Server & Supabase asynchronously
    saveAccountAsync(account).catch(err => console.warn('Background account sync warning:', err));
  } catch (err) {
    console.error('Failed to save account:', err);
  }
}

export async function saveAccountAsync(account: UserAccount): Promise<{ success: boolean; message?: string }> {
  const cleanKey = account.username.toLowerCase();
  let serverSaved = false;
  let serverError = '';

  // 1. Post to Server Cloud API (syncs across devices)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const clientUrl = getSupabaseUrl();
    const clientKey = getSupabaseAnonKey();
    if (clientUrl) headers['x-supabase-url'] = clientUrl;
    if (clientKey) headers['x-supabase-key'] = clientKey;

    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers,
      body: JSON.stringify(account)
    });

    const json = await res.json();
    if (res.ok && json.supabaseSaved) {
      serverSaved = true;
    } else {
      serverError = json.supabaseError || json.message || `Server returned status ${res.status}`;
      console.warn('Server API account sync notice:', serverError);
    }
  } catch (err: any) {
    serverError = err.message || 'Network error sync';
    console.warn('Server API account sync notice:', err);
  }

  // 2. Post to Supabase direct client if configured
  const client = getSupabaseClient();
  if (client) {
    try {
      const payload = {
        username: cleanKey,
        full_name: account.fullName,
        phone: account.phone || '',
        email: account.email || '',
        parent_name: account.parentName || '',
        parent_phone: account.parentPhone || '',
        parent_email: account.parentEmail || '',
        safety_score: account.safetyScore,
        clean_trips: account.cleanTrips,
        total_trips: account.totalTrips,
        total_distance_miles: account.totalDistanceMiles,
        points: account.points,
        level: account.level,
        current_xp: account.currentXp,
        next_level_xp: account.nextLevelXp,
        badges_unlocked: account.badgesUnlocked,
        trip_history: account.tripHistory,
        account_data: account,
        updated_at: new Date().toISOString()
      };

      const { error: upsertErr } = await client.from('driver_accounts').upsert(payload, { onConflict: 'username' });
      if (!upsertErr) {
        return { success: true };
      }

      const { error: updateErr } = await client.from('driver_accounts').update(payload).eq('username', cleanKey);
      if (!updateErr) {
        return { success: true };
      }

      const { error: insertErr } = await client.from('driver_accounts').insert(payload);
      if (!insertErr) {
        return { success: true };
      }

      return {
        success: false,
        message: upsertErr.message || updateErr?.message || insertErr?.message || 'Failed to save to Supabase'
      };
    } catch (err: any) {
      console.warn('Supabase driver_accounts save exception:', err);
      return { success: false, message: err.message };
    }
  }

  if (serverSaved) {
    return { success: true };
  }

  return {
    success: false,
    message: serverError || 'Account saved locally.'
  };
}

export async function createAccountAsync(data: {
  username: string;
  fullName: string;
  phone?: string;
  email?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  preferredLanguage?: LanguageCode;
  unitSystem?: UnitSystem;
  role?: UserRole;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
}): Promise<{ account: UserAccount; syncResult: { success: boolean; message?: string } }> {
  const cleanName = data.username.trim();
  const country = data.country?.trim() || 'United States';
  const unitSys = data.unitSystem || getUnitSystemForCountry(country);
  const lang = data.preferredLanguage || 'en';

  const newAccount: UserAccount = {
    username: cleanName,
    fullName: data.fullName.trim() || cleanName,
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    city: data.city?.trim() || '',
    stateProvince: data.stateProvince?.trim() || '',
    country: country,
    preferredLanguage: lang,
    unitSystem: unitSys,
    role: data.role || 'young_driver',
    parentName: data.parentName?.trim() || '',
    parentPhone: data.parentPhone?.trim() || '',
    parentEmail: data.parentEmail?.trim() || '',
    createdTime: Date.now(),
    safetyScore: 100,
    cleanTrips: 0,
    totalTrips: 0,
    totalDistanceMiles: 0,
    points: 0,
    level: 1,
    currentXp: 0,
    nextLevelXp: 1000,
    badgesUnlocked: ['BRONZE_GUARDIAN'],
    tripHistory: [],
    supervisorCode: 'RAD-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
    preferences: {
      audioVoiceAlerts: true,
      audioChimes: true,
      autoTripDetection: true,
      speedLimitWarnings: true,
      offlineSyncEnabled: true,
      role: data.role || 'young_driver',
      gdlEnabled: true
    }
  };

  saveAccount(newAccount);
  const syncResult = await saveAccountAsync(newAccount);
  setActiveUsername(cleanName);
  return { account: newAccount, syncResult };
}

export function logoutActiveUser(): void {
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

function getAccountsMap(): Record<string, UserAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_MAP_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function recordTripForActiveUser(tripSummary: any, unitSystem: UnitSystem): UserAccount | null {
  const activeUsername = getActiveUsername();
  if (!activeUsername) return null;

  const account = getAccount(activeUsername);
  if (!account) return null;

  // Calculate trip physics
  const rawDist = typeof tripSummary?.distanceKm === 'number'
    ? tripSummary.distanceKm
    : (typeof tripSummary?.distance_km === 'number' ? tripSummary.distance_km : 0);
  const distanceKm = typeof rawDist === 'number' && rawDist >= 0 ? rawDist : 0;
  const distanceMiles = parseFloat((distanceKm * 0.621371).toFixed(2));
  const durationSeconds = tripSummary?.duration_seconds || tripSummary?.durationSec || 60;
  
  const classification = tripSummary?.classification || {};
  const tripSafetyScore = typeof classification.safety_score === 'number' ? classification.safety_score : 95;
  
  const avgVelKmh = tripSummary?.trip_summary?.avg_velocity_kmh || (tripSummary?.telemetry?.length ? (tripSummary.telemetry.reduce((a: any, b: any) => a + (b.velocity || 0), 0) / tripSummary.telemetry.length) : 0);
  const maxSpeedKmh = tripSummary?.trip_summary?.max_velocity_kmh || (tripSummary?.telemetry?.length ? Math.max(...tripSummary.telemetry.map((t: any) => t.velocity || 0)) : avgVelKmh);
  const maxSpeedMph = parseFloat((maxSpeedKmh * 0.621371).toFixed(1));
  const harshEvents = (tripSummary?.harshBrakingCount || tripSummary?.trip_summary?.harsh_braking_count || 0) + 
                      (tripSummary?.harshCorneringCount || tripSummary?.trip_summary?.harsh_cornering_count || 0);

  const isClean = tripSafetyScore >= 80;

  // New totals
  const newTotalTrips = account.totalTrips + 1;
  const newCleanTrips = account.cleanTrips + (isClean ? 1 : 0);
  const newTotalDistMiles = parseFloat((account.totalDistanceMiles + distanceMiles).toFixed(2));
  
  // Weighted average safety score
  const newAvgSafetyScore = Math.round(
    ((account.safetyScore * account.totalTrips) + tripSafetyScore) / newTotalTrips
  );

  // Points & XP
  const xpEarned = isClean ? 200 : 100;
  const pointsEarned = isClean ? 100 : 50;

  let newXp = account.currentXp + xpEarned;
  let newLevel = account.level;
  let nextXp = account.nextLevelXp;

  while (newXp >= nextXp) {
    newLevel += 1;
    nextXp += 1500;
  }

  // Evaluate new unlocked badges
  const newBadges = [...account.badgesUnlocked];
  
  if (newTotalTrips >= 1 && !newBadges.includes('FIRST_SAFE_DRIVE')) {
    newBadges.push('FIRST_SAFE_DRIVE');
  }
  if (newCleanTrips >= 3 && !newBadges.includes('CLEAN_STREAK_3')) {
    newBadges.push('CLEAN_STREAK_3');
  }
  if (newTotalDistMiles >= 25 && !newBadges.includes('25_MILES_SAFE')) {
    newBadges.push('25_MILES_SAFE');
  }
  if (newTotalDistMiles >= 100 && !newBadges.includes('100_MILES_SAFE')) {
    newBadges.push('100_MILES_SAFE');
  }
  if (newAvgSafetyScore >= 90 && newTotalTrips >= 3 && !newBadges.includes('PLATINUM_GUARDIAN')) {
    newBadges.push('PLATINUM_GUARDIAN');
  }

  const tripId = `trip_${Date.now()}`;
  const newTripRecord: TripRecord = {
    id: tripId,
    timestamp: Date.now(),
    distanceMiles,
    durationSeconds,
    safetyScore: tripSafetyScore,
    maxSpeedMph,
    harshEvents
  };

  // Construct detailed StoredTrip for route replay & offline sync
  const isNight = new Date().getHours() >= 19 || new Date().getHours() < 6;
  const rawBreadcrumbs: TripBreadcrumb[] = (tripSummary?.telemetry || []).map((t: any, idx: number) => ({
    timestamp: t.timestamp || (Date.now() - (tripSummary.telemetry.length - idx) * 1000),
    lat: t.lat || (37.7749 + (idx * 0.0003)),
    lng: t.lng || (-122.4194 + (Math.sin(idx / 5) * 0.0004)),
    speedMph: parseFloat(((t.velocity || 0) * 0.621371).toFixed(1)),
    speedLimitMph: t.speedLimitMph || 35,
    isHarsh: Math.abs(t.braking_jerk || 0) > 2.5 || Math.sqrt((t.g_force_x || 0) ** 2 + (t.g_force_y || 0) ** 2) > 0.55,
    eventLabel: Math.abs(t.braking_jerk || 0) > 2.5 ? 'Abrupt Brake' : (Math.sqrt((t.g_force_x || 0) ** 2 + (t.g_force_y || 0) ** 2) > 0.55 ? 'Abrupt Turn' : undefined)
  }));

  const fullStoredTrip: StoredTrip = {
    id: tripId,
    driverUsername: activeUsername,
    startTime: tripSummary?.tripStartTime || (Date.now() - durationSeconds * 1000),
    endTime: Date.now(),
    durationSeconds,
    distanceMiles,
    safetyScore: tripSafetyScore,
    topSpeedMph: maxSpeedMph,
    avgSpeedMph: parseFloat((avgVelKmh * 0.621371).toFixed(1)),
    harshBrakingCount: tripSummary?.harshBrakingCount || 0,
    harshCorneringCount: tripSummary?.harshCorneringCount || 0,
    isNightTrip: isNight,
    weatherCondition: tripSummary?.weatherCondition || 'Clear',
    syncedToCloud: false,
    breadcrumbs: rawBreadcrumbs.length > 0 ? rawBreadcrumbs : [
      { timestamp: Date.now() - 30000, lat: 37.7749, lng: -122.4194, speedMph: maxSpeedMph * 0.7, speedLimitMph: 35, isHarsh: false },
      { timestamp: Date.now(), lat: 37.7770, lng: -122.4160, speedMph: 0, speedLimitMph: 35, isHarsh: false }
    ]
  };

  saveTrip(fullStoredTrip);

  const updatedAccount: UserAccount = {
    ...account,
    totalTrips: newTotalTrips,
    cleanTrips: newCleanTrips,
    totalDistanceMiles: newTotalDistMiles,
    safetyScore: newAvgSafetyScore,
    points: account.points + pointsEarned,
    currentXp: newXp,
    level: newLevel,
    nextLevelXp: nextXp,
    badgesUnlocked: newBadges,
    tripHistory: [newTripRecord, ...account.tripHistory]
  };

  saveAccount(updatedAccount);
  return updatedAccount;
}

export function updateLastTripAnalysis(analysisData: any): UserAccount | null {
  const activeUsername = getActiveUsername();
  if (!activeUsername) return null;

  const account = getAccount(activeUsername);
  if (!account || !account.tripHistory.length) return null;

  const classification = analysisData?.classification || {};
  if (typeof classification.safety_score !== 'number') return account;

  const updatedScore = classification.safety_score;
  const history = [...account.tripHistory];
  history[0] = {
    ...history[0],
    safetyScore: updatedScore
  };

  // Recalculate average safety score
  const totalScoreSum = history.reduce((sum, trip) => sum + trip.safetyScore, 0);
  const newAvgScore = Math.round(totalScoreSum / history.length);

  const cleanTripsCount = history.filter(t => t.safetyScore >= 80).length;

  const updatedAccount: UserAccount = {
    ...account,
    safetyScore: newAvgScore,
    cleanTrips: cleanTripsCount,
    tripHistory: history
  };

  saveAccount(updatedAccount);
  return updatedAccount;
}
