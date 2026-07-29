import { UnitSystem } from '../types';

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
    // Ensure account object exists in account map
    getAccount(cleanName);
  } catch (err) {
    console.error('Failed to set active username:', err);
  }
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

export function getAccount(username: string): UserAccount {
  const cleanName = username.trim();
  const allMap = getAccountsMap();
  
  if (allMap[cleanName.toLowerCase()]) {
    return allMap[cleanName.toLowerCase()];
  }

  // Create new real account
  const newAccount: UserAccount = {
    username: cleanName,
    fullName: cleanName,
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
  return newAccount;
}

export function saveAccount(account: UserAccount): void {
  try {
    const allMap = getAccountsMap();
    allMap[account.username.toLowerCase()] = account;
    localStorage.setItem(ACCOUNTS_MAP_KEY, JSON.stringify(allMap));
  } catch (err) {
    console.error('Failed to save account:', err);
  }
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

  // Calculate trip physics
  const distanceKm = tripSummary?.distance_km || tripSummary?.trip_summary?.avg_velocity_kmh ? 1.5 : 1.0;
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
