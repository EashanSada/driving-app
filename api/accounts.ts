import { createClient } from '@supabase/supabase-js';

// Global serverless memory cache for multi-device sync
const inMemoryAccountsMap: Record<string, any> = {};

function getSupabaseServerClient() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (url && key) {
    try {
      return createClient(url, key, { auth: { persistSession: false } });
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseServerClient();

  if (req.method === 'GET') {
    const { username } = req.query || {};

    if (username) {
      const cleanName = String(username).trim().toLowerCase();

      // 1. Try Supabase
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('driver_accounts')
            .select('*')
            .eq('username', cleanName)
            .maybeSingle();

          if (!error && data) {
            const acc = data.account_data || {
              username: data.username,
              fullName: data.full_name,
              phone: data.phone,
              email: data.email,
              parentName: data.parent_name,
              parentPhone: data.parent_phone,
              parentEmail: data.parent_email,
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
            inMemoryAccountsMap[cleanName] = acc;
            return res.status(200).json({ status: 'success', account: acc });
          }
        } catch (err) {
          console.warn('Server Supabase fetch account error:', err);
        }
      }

      // 2. Fallback to memory cache
      if (inMemoryAccountsMap[cleanName]) {
        return res.status(200).json({ status: 'success', account: inMemoryAccountsMap[cleanName] });
      }

      return res.status(404).json({ status: 'not_found', message: 'Account not found' });
    } else {
      // Return all accounts
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('driver_accounts')
            .select('*')
            .order('safety_score', { ascending: false });

          if (!error && data && data.length > 0) {
            const accounts = data.map((item: any) => item.account_data || {
              username: item.username,
              fullName: item.full_name,
              phone: item.phone,
              email: item.email,
              parentName: item.parent_name,
              parentPhone: item.parent_phone,
              parentEmail: item.parent_email,
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
            });

            accounts.forEach((acc: any) => {
              if (acc.username) inMemoryAccountsMap[acc.username.toLowerCase()] = acc;
            });

            return res.status(200).json({ status: 'success', accounts });
          }
        } catch (err) {
          console.warn('Server Supabase fetch all accounts error:', err);
        }
      }

      return res.status(200).json({ status: 'success', accounts: Object.values(inMemoryAccountsMap) });
    }
  }

  if (req.method === 'POST') {
    const account = req.body || {};
    if (!account.username) {
      return res.status(400).json({ status: 'error', message: 'Username is required' });
    }

    const cleanKey = String(account.username).trim().toLowerCase();
    inMemoryAccountsMap[cleanKey] = account;

    if (supabase) {
      try {
        const payload = {
          username: cleanKey,
          full_name: account.fullName || account.username,
          phone: account.phone || '',
          email: account.email || '',
          parent_name: account.parentName || '',
          parent_phone: account.parentPhone || '',
          parent_email: account.parentEmail || '',
          safety_score: account.safetyScore || 100,
          clean_trips: account.cleanTrips || 0,
          total_trips: account.totalTrips || 0,
          total_distance_miles: account.totalDistanceMiles || 0,
          points: account.points || 0,
          level: account.level || 1,
          current_xp: account.currentXp || 0,
          next_level_xp: account.nextLevelXp || 1000,
          badges_unlocked: account.badgesUnlocked || ['BRONZE_GUARDIAN'],
          trip_history: account.tripHistory || [],
          account_data: account,
          updated_at: new Date().toISOString()
        };

        await supabase.from('driver_accounts').upsert(payload, { onConflict: 'username' });
      } catch (err) {
        console.warn('Server Supabase save account warning:', err);
      }
    }

    return res.status(200).json({ status: 'success', account });
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
