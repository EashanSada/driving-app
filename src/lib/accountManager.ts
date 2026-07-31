import { UnitSystem } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

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
}

const ACTIVE_USER_KEY = 'drivesafe_active_username_v2';
const ACCOUNTS_MAP_KEY = 'drivesafe_accounts_map_v2';

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
  phone: string;
  email: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}): UserAccount {
  const cleanName = data.username.trim();
  const newAccount: UserAccount = {
    username: cleanName,
    fullName: data.fullName.trim() || cleanName,
    phone: data.phone.trim(),
    email: data.email.trim(),
    parentName: data.parentName.trim(),
    parentPhone: data.parentPhone.trim(),
    parentEmail: data.parentEmail.trim(),
    createdTime: Date.now(),
    safetyScore: 100,
    cleanTrips: 0,
    totalTrips: 0,
    totalDistanceMiles: 0,
    points: 0,
    level: 1,
    currentXp: 0,
    nextLevelXp: 1000,
    badgesUnlocked: [],
    tripHistory: []
  };

  saveAccount(newAccount);
  setActiveUsername(cleanName);
  return newAccount;
}

export async function fetchAccountFromSupabase(username: string): Promise<UserAccount | null> {
  const cleanName = username.trim();
  if (!cleanName) return null;

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const cleanLower = cleanName.toLowerCase();
    
    // First try exact lowercase match
    let { data, error } = await client
      .from('driver_accounts')
      .select('*')
      .eq('username', cleanLower)
      .maybeSingle();

    // If not found, try case-insensitive ilike match
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

      // Save to local cache
      const allMap = getAccountsMap();
      allMap[parsedAccount.username.toLowerCase()] = parsedAccount;
      localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(allMap));
      return parsedAccount;
    }
  } catch (err) {
    console.warn('Supabase account fetch notice:', err);
  }

  return null;
}

export async function fetchAllAccountsFromSupabase(): Promise<UserAccount[]> {
  const localAccounts = getAllAccounts();
  const client = getSupabaseClient();
  if (!client) return localAccounts;

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

  return localAccounts;
}

export function saveAccount(account: UserAccount): void {
  try {
    const cleanKey = account.username.toLowerCase();
    const allMap = getAccountsMap();
    allMap[cleanKey] = account;
    localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(allMap));

    if (getSupabaseClient()) {
      saveAccountAsync(account).catch(err => console.warn('Background save warning:', err));
    }
  } catch (err) {
    console.error('Failed to save account:', err);
  }
}

export async function saveAccountAsync(account: UserAccount): Promise<void> {
  const cleanKey = account.username.toLowerCase();
  const client = getSupabaseClient();
  
  if (!client) return;

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

    const { error } = await client
      .from('driver_accounts')
      .upsert(payload, { onConflict: 'username' });

    if (error) {
      console.warn('Supabase driver_accounts upsert notice:', error.message);
    }
  } catch (err) {
    console.error('saveAccountAsync error:', err);
  }
}

export async function createAccountAsync(data: {
  username: string;
  fullName: string;
  phone: string;
  email: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}): Promise<UserAccount> {
  const cleanName = data.username.trim();
  const newAccount: UserAccount = {
    username: cleanName,
    fullName: data.fullName.trim() || cleanName,
    phone: data.phone.trim(),
    email: data.email.trim(),
    parentName: data.parentName.trim(),
    parentPhone: data.parentPhone.trim(),
    parentEmail: data.parentEmail.trim(),
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
    tripHistory: []
  };

  saveAccount(newAccount);
  await saveAccountAsync(newAccount);
  setActiveUsername(cleanName);
  return newAccount;
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
  const distanceKm = rawDist > 0 ? rawDist : 1.0;
  const distanceMiles = distanceKm * 0.621371;
  const durationSeconds = tripSummary?.duration_seconds || 120;
  
  const classification = tripSummary?.classification || {};
  const tripSafetyScore = typeof classification.safety_score === 'number' ? classification.safety_score : 90;
  
  const avgVelKmh = tripSummary?.trip_summary?.avg_velocity_kmh || 35;
  const maxSpeedMph = (tripSummary?.trip_summary?.max_velocity_kmh || avgVelKmh * 1.3) * 0.621371;
  const harshEvents = (tripSummary?.trip_summary?.harsh_braking_count || 0) + (tripSummary?.trip_summary?.harsh_cornering_count || 0);

  const isClean = tripSafetyScore >= 80;

  // New totals
  const newTotalTrips = account.totalTrips + 1;
  const newCleanTrips = account.cleanTrips + (isClean ? 1 : 0);
  const newTotalDistMiles = account.totalDistanceMiles + distanceMiles;
  
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

  const newTripRecord: TripRecord = {
    id: `trip_${Date.now()}`,
    timestamp: Date.now(),
    distanceMiles,
    durationSeconds,
    safetyScore: tripSafetyScore,
    maxSpeedMph,
    harshEvents
  };

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
