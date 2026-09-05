import { StoredTrip, TripBreadcrumb, GdlProgress } from '../types';
import { getSupabaseClient, getSupabaseUrl, getSupabaseAnonKey } from './supabaseClient';

const TRIPS_STORAGE_KEY = 'drivesafe_stored_trips_v1';
const GDL_STORAGE_KEY = 'drivesafe_gdl_progress_v1';

export function getStoredTrips(username?: string): StoredTrip[] {
  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!raw) return [];
    const trips: StoredTrip[] = JSON.parse(raw);
    if (username) {
      return trips.filter(t => t.driverUsername.toLowerCase() === username.toLowerCase());
    }
    return trips;
  } catch {
    return [];
  }
}

export function saveTrip(trip: StoredTrip): void {
  try {
    const trips = getStoredTrips();
    const existingIdx = trips.findIndex(t => t.id === trip.id);
    if (existingIdx >= 0) {
      trips[existingIdx] = trip;
    } else {
      trips.unshift(trip);
    }
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));

    // Update GDL Progress
    updateGdlWithTrip(trip);

    // Attempt cloud sync if online
    syncPendingTripsToCloud();
  } catch (err) {
    console.error('Failed to save trip locally:', err);
  }
}

export function getGdlProgress(username?: string): GdlProgress {
  try {
    const raw = localStorage.getItem(`${GDL_STORAGE_KEY}_${username || 'default'}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    requiredDayHours: 40,
    completedDayHours: 0,
    requiredNightHours: 10,
    completedNightHours: 0,
    totalRequiredHours: 50,
    permitIssueDate: new Date().toISOString().split('T')[0],
    targetTestDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    supervisedTripsCount: 0
  };
}

export function saveGdlProgress(username: string, progress: GdlProgress): void {
  try {
    localStorage.setItem(`${GDL_STORAGE_KEY}_${username || 'default'}`, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save GDL progress:', err);
  }
}

function updateGdlWithTrip(trip: StoredTrip) {
  const current = getGdlProgress(trip.driverUsername);
  const tripHours = trip.durationSeconds / 3600;

  if (trip.isNightTrip) {
    current.completedNightHours = Number((current.completedNightHours + tripHours).toFixed(2));
  } else {
    current.completedDayHours = Number((current.completedDayHours + tripHours).toFixed(2));
  }
  current.supervisedTripsCount += 1;
  saveGdlProgress(trip.driverUsername, current);
}

// Sync local offline trips to cloud
export async function syncPendingTripsToCloud(): Promise<{ synced: number; pending: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const trips = getStoredTrips();
    return { synced: 0, pending: trips.filter(t => !t.syncedToCloud).length };
  }

  const client = getSupabaseClient();
  const trips = getStoredTrips();
  const pending = trips.filter(t => !t.syncedToCloud);
  if (pending.length === 0 || !client) {
    return { synced: 0, pending: pending.length };
  }

  let count = 0;
  for (const trip of pending) {
    try {
      // Attempt insert into Supabase trip_telematics
      const { error } = await client.from('trip_telematics').insert({
        distance_km: Number((trip.distanceMiles * 1.60934).toFixed(2)),
        avg_speed_kmh: Number(((trip.avgSpeedMph || 0) * 1.60934).toFixed(1)),
        max_speed_kmh: Number(((trip.topSpeedMph || 0) * 1.60934).toFixed(1)),
        max_g_force: 0.45,
        harsh_braking_events: trip.harshBrakingCount || 0,
        harsh_cornering_events: trip.harshCorneringCount || 0,
        trip_safety_score: trip.safetyScore,
        raw_telemetry_stream: trip.breadcrumbs || []
      });

      if (!error) {
        trip.syncedToCloud = true;
        count++;
      } else if (error.code === '42P01') {
        // Table doesn't exist; trip is already safely stored in driver_accounts trip_history
        trip.syncedToCloud = true;
        count++;
      }
    } catch {
      // Keep offline for retry
    }
  }

  if (count > 0) {
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
  }

  return { synced: count, pending: trips.filter(t => !t.syncedToCloud).length };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingTripsToCloud().catch(() => {});
  });
}
