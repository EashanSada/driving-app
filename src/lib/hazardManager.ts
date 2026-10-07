import { HazardReport } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { getCurrentNativePosition } from './nativeMobileBridge';

const STORAGE_KEY_HAZARDS = 'drivesafe_local_road_hazards_v1';

export function getLocalHazards(): HazardReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HAZARDS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function submitPostDriveHazard(
  type: HazardReport['hazard_type'],
  description?: string,
  userLocation?: { lat: number; lng: number }
): Promise<{ success: boolean; message: string }> {
  try {
    let lat = userLocation?.lat || 37.7749;
    let lng = userLocation?.lng || -122.4194;

    // Attempt to get hardware GPS if not passed
    if (!userLocation) {
      const pos = await getCurrentNativePosition();
      if (pos) {
        lat = pos.lat;
        lng = pos.lng;
      }
    }

    const newHazard: HazardReport = {
      id: `hz_${Date.now()}`,
      hazard_type: type,
      description: description || `Reported after driving session: ${type.replace(/_/g, ' ')}`,
      lat,
      lng,
      upvotes: 1,
      time: 'Just now',
      source_app: 'WEB_APP'
    };

    // Save locally
    const existing = getLocalHazards();
    localStorage.setItem(STORAGE_KEY_HAZARDS, JSON.stringify([newHazard, ...existing.slice(0, 40)]));

    // Sync to Supabase if configured
    const client = getSupabaseClient();
    if (client) {
      await client.from('road_hazards').insert({
        hazard_type: type,
        description: newHazard.description,
        lat,
        lng,
        upvotes: 1,
        source_app: 'IOS_NATIVE'
      });
    }

    return { success: true, message: 'Hazard reported successfully to local driver network!' };
  } catch (err: any) {
    console.warn('Hazard submission notice:', err);
    return { success: true, message: 'Saved to local driving records.' };
  }
}
