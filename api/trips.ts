import { applySecurityHeaders, enforceRateLimit, sanitizeString } from './_security';
import { getSupabaseClient, getSupabaseUrl, getSupabaseAnonKey } from '../src/lib/supabaseClient';

const inMemoryTrips: any[] = [];

export default async function handler(req: any, res: any) {
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting (60 requests per minute)
  const rateLimit = enforceRateLimit(req, 'trips_sync', 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return res.status(rateLimit.statusCode || 429).json({
      status: 'error',
      message: rateLimit.message
    });
  }

  if (req.method === 'GET') {
    const username = sanitizeString(req.query?.username || '', 50);
    let filtered = inMemoryTrips;
    if (username) {
      filtered = inMemoryTrips.filter(t => t.driverUsername?.toLowerCase() === username.toLowerCase());
    }
    return res.status(200).json({
      status: 'success',
      trips: filtered
    });
  }

  if (req.method === 'POST') {
    try {
      const trip = req.body;
      if (!trip || !trip.id) {
        return res.status(400).json({ status: 'error', message: 'Invalid trip payload' });
      }

      const existingIdx = inMemoryTrips.findIndex(t => t.id === trip.id);
      if (existingIdx >= 0) {
        inMemoryTrips[existingIdx] = trip;
      } else {
        inMemoryTrips.unshift(trip);
      }

      // Try Supabase sync
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('driver_trips').upsert({
            id: trip.id,
            username: trip.driverUsername,
            trip_data: trip,
            created_at: new Date(trip.startTime).toISOString()
          });
        } catch {
          // Continue if Supabase table is not provisioned
        }
      }

      return res.status(200).json({
        status: 'success',
        tripId: trip.id,
        synced: true
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
