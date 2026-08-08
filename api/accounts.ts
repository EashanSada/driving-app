import { createClient } from '@supabase/supabase-js';

function getSupabaseServerClient(req?: any) {
  // Check request headers first (passed from frontend if configured in UI), then process.env
  const headerUrl = req?.headers?.['x-supabase-url'] || req?.headers?.['authorization-url'];
  const headerKey = req?.headers?.['x-supabase-key'] || req?.headers?.['authorization-key'];

  const url =
    (typeof headerUrl === 'string' && headerUrl.trim()) ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    '';

  const key =
    (typeof headerKey === 'string' && headerKey.trim()) ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (url && key) {
    try {
      return {
        client: createClient(url, key, { auth: { persistSession: false } }),
        url,
        key: key.substring(0, 10) + '...'
      };
    } catch (err: any) {
      console.error('Failed to create Supabase server client:', err);
      return { client: null, url, error: err.message };
    }
  }
  return { client: null, url: '', key: '' };
}

export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-supabase-url, x-supabase-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { client: supabase, url: envUrl, error: clientErr } = getSupabaseServerClient(req);

  // Diagnostic health check for the UI modal
  if (req.method === 'GET' && req.query?.action === 'test') {
    if (!supabase) {
      return res.status(200).json({
        status: 'error',
        configured: false,
        message: clientErr || 'Supabase URL or Anon Key is missing on the server. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Environment Variables or set credentials in app settings.',
        envUrlPresent: Boolean(envUrl)
      });
    }

    try {
      const { data, error } = await supabase.from('driver_accounts').select('username').limit(1);
      if (error) {
        return res.status(200).json({
          status: 'error',
          configured: true,
          tableExists: error.code !== '42P01',
          code: error.code,
          message: error.code === '42P01' 
            ? 'Connected to Supabase, but "driver_accounts" table does not exist. Please run schema.sql in Supabase SQL Editor.'
            : error.message,
          details: error.details || error.hint || ''
        });
      }

      // Try a test upsert to confirm WRITE permissions
      const testUsername = '__drivesafe_diagnostic_test__';
      const testPayload = {
        username: testUsername,
        full_name: 'Diagnostic Test User',
        safety_score: 100,
        updated_at: new Date().toISOString()
      };

      const { error: writeErr } = await supabase.from('driver_accounts').upsert(testPayload, { onConflict: 'username' });
      let writeSuccess = !writeErr;

      if (writeErr) {
        // Fallback write check
        const { error: insertErr } = await supabase.from('driver_accounts').insert(testPayload);
        if (!insertErr) writeSuccess = true;
      }

      // Cleanup test row if written
      if (writeSuccess) {
        await supabase.from('driver_accounts').delete().eq('username', testUsername);
      }

      return res.status(200).json({
        status: 'success',
        configured: true,
        tableExists: true,
        writePermission: writeSuccess,
        message: writeSuccess 
          ? 'Connected to Supabase driver_accounts table! Read & Write access confirmed.'
          : 'Connected to Supabase driver_accounts table, but Write test returned a warning: ' + (writeErr?.message || 'Check RLS policy')
      });
    } catch (err: any) {
      return res.status(200).json({
        status: 'error',
        configured: true,
        message: err.message || 'Failed to query Supabase'
      });
    }
  }

  if (req.method === 'GET') {
    const { username } = req.query || {};

    if (!supabase) {
      return res.status(503).json({
        status: 'error',
        message: 'Supabase database is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.'
      });
    }

    if (username) {
      const cleanName = String(username).trim().toLowerCase();

      try {
        const { data, error } = await supabase
          .from('driver_accounts')
          .select('*')
          .eq('username', cleanName)
          .maybeSingle();

        if (error) {
          return res.status(500).json({
            status: 'error',
            message: `Supabase query error: ${error.message}`
          });
        }

        if (!data) {
          return res.status(404).json({ status: 'not_found', message: 'Account not found in Supabase' });
        }

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
        return res.status(200).json({ status: 'success', account: acc, source: 'supabase' });
      } catch (err: any) {
        return res.status(500).json({ status: 'error', message: err.message || 'Supabase exception' });
      }
    } else {
      // Return all accounts directly from Supabase
      try {
        const { data, error } = await supabase
          .from('driver_accounts')
          .select('*')
          .order('safety_score', { ascending: false });

        if (error) {
          return res.status(500).json({
            status: 'error',
            message: `Supabase query error: ${error.message}`
          });
        }

        const accounts = (data || []).map((item: any) => item.account_data || {
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

        return res.status(200).json({ status: 'success', accounts, source: 'supabase' });
      } catch (err: any) {
        return res.status(500).json({ status: 'error', message: err.message || 'Supabase exception' });
      }
    }
  }

  if (req.method === 'POST') {
    const account = req.body || {};
    if (!account.username) {
      return res.status(400).json({ status: 'error', message: 'Username is required' });
    }

    if (!supabase) {
      return res.status(503).json({
        status: 'error',
        supabaseSaved: false,
        message: 'Supabase server client not initialized. Check URL and Anon Key in Vercel environment variables or app settings.'
      });
    }

    const cleanKey = String(account.username).trim().toLowerCase();

    try {
      const payload = {
        username: cleanKey,
        full_name: account.fullName || account.username,
        phone: account.phone || '',
        email: account.email || '',
        parent_name: account.parentName || '',
        parent_phone: account.parentPhone || '',
        parent_email: account.parentEmail || '',
        safety_score: Number(account.safetyScore) || 100,
        clean_trips: Number(account.cleanTrips) || 0,
        total_trips: Number(account.totalTrips) || 0,
        total_distance_miles: Number(account.totalDistanceMiles) || 0,
        points: Number(account.points) || 0,
        level: Number(account.level) || 1,
        current_xp: Number(account.currentXp) || 0,
        next_level_xp: Number(account.nextLevelXp) || 1000,
        badges_unlocked: Array.isArray(account.badgesUnlocked) ? account.badgesUnlocked : ['BRONZE_GUARDIAN'],
        trip_history: Array.isArray(account.tripHistory) ? account.tripHistory : [],
        account_data: account,
        updated_at: new Date().toISOString()
      };

      // 1. Try Upsert
      const { data, error: upsertErr } = await supabase.from('driver_accounts').upsert(payload, { onConflict: 'username' }).select();

      if (!upsertErr) {
        return res.status(200).json({
          status: 'success',
          account,
          supabaseSaved: true,
          data
        });
      }

      console.warn('Supabase driver_accounts upsert notice:', upsertErr.message);

      // 2. Fallback: Update existing row
      const { error: updateErr } = await supabase.from('driver_accounts').update(payload).eq('username', cleanKey);
      if (!updateErr) {
        return res.status(200).json({
          status: 'success',
          account,
          supabaseSaved: true,
          method: 'update'
        });
      }

      // 3. Fallback: Insert new row
      const { error: insertErr } = await supabase.from('driver_accounts').insert(payload);
      if (!insertErr) {
        return res.status(200).json({
          status: 'success',
          account,
          supabaseSaved: true,
          method: 'insert'
        });
      }

      const finalErrMsg = upsertErr.message || updateErr.message || insertErr.message;
      return res.status(500).json({
        status: 'error',
        supabaseSaved: false,
        supabaseError: finalErrMsg,
        details: 'Check Supabase table structure or RLS policies for driver_accounts.'
      });
    } catch (err: any) {
      console.error('Server Supabase save account exception:', err);
      return res.status(500).json({
        status: 'error',
        supabaseSaved: false,
        supabaseError: err.message || 'Supabase exception during save'
      });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
