import { createClient } from '@supabase/supabase-js';
import { applySecurityHeaders, enforceRateLimit, sanitizeString, maskPiiAccount } from './_security';

function getSupabaseServerClient(req?: any) {
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
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting (60 requests per minute per IP)
  const rateLimitCheck = enforceRateLimit(req, 'accounts', 60, 60 * 1000);
  if (!rateLimitCheck.allowed) {
    return res.status(rateLimitCheck.statusCode || 429).json({
      status: 'error',
      message: rateLimitCheck.message
    });
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
      const { error } = await supabase.from('driver_accounts').select('username').limit(1);
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
      const cleanName = sanitizeString(username, 50).toLowerCase();

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
          city: data.city || '',
          stateProvince: data.state_province || '',
          country: data.country || '',
          preferredLanguage: data.preferred_language || 'en',
          unitSystem: data.unit_system || 'imperial',
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
      // Return all accounts directly from Supabase (Mask sensitive PII for public leaderboard)
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

        const accounts = (data || []).map((item: any) => {
          const raw = item.account_data || {
            username: item.username,
            fullName: item.full_name,
            phone: item.phone,
            email: item.email,
            city: item.city || '',
            stateProvince: item.state_province || '',
            country: item.country || '',
            preferredLanguage: item.preferred_language || 'en',
            unitSystem: item.unit_system || 'imperial',
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
          };
          return maskPiiAccount(raw);
        });

        return res.status(200).json({ status: 'success', accounts, source: 'supabase' });
      } catch (err: any) {
        return res.status(500).json({ status: 'error', message: err.message || 'Supabase exception' });
      }
    }
  }

  if (req.method === 'POST') {
    const rawAccount = req.body || {};
    if (!rawAccount.username) {
      return res.status(400).json({ status: 'error', message: 'Username is required' });
    }

    if (!supabase) {
      return res.status(503).json({
        status: 'error',
        supabaseSaved: false,
        message: 'Supabase server client not initialized. Check URL and Anon Key in Vercel environment variables or app settings.'
      });
    }

    const cleanUsername = sanitizeString(rawAccount.username, 30).toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanFullName = sanitizeString(rawAccount.fullName || rawAccount.username, 80);
    const cleanPhone = sanitizeString(rawAccount.phone || '', 25);
    const cleanEmail = sanitizeString(rawAccount.email || '', 100);
    const cleanCity = sanitizeString(rawAccount.city || '', 80);
    const cleanStateProvince = sanitizeString(rawAccount.stateProvince || '', 80);
    const cleanCountry = sanitizeString(rawAccount.country || '', 80);
    const cleanPreferredLanguage = sanitizeString(rawAccount.preferredLanguage || 'en', 10);
    const cleanUnitSystem = rawAccount.unitSystem === 'metric' ? 'metric' : 'imperial';
    const cleanParentName = sanitizeString(rawAccount.parentName || '', 80);
    const cleanParentPhone = sanitizeString(rawAccount.parentPhone || '', 25);
    const cleanParentEmail = sanitizeString(rawAccount.parentEmail || '', 100);

    try {
      const payload = {
        username: cleanUsername,
        full_name: cleanFullName,
        phone: cleanPhone,
        email: cleanEmail,
        parent_name: cleanParentName,
        parent_phone: cleanParentPhone,
        parent_email: cleanParentEmail,
        safety_score: Math.min(100, Math.max(0, Number(rawAccount.safetyScore) || 100)),
        clean_trips: Math.max(0, Number(rawAccount.cleanTrips) || 0),
        total_trips: Math.max(0, Number(rawAccount.totalTrips) || 0),
        total_distance_miles: Math.max(0, Number(rawAccount.totalDistanceMiles) || 0),
        points: Math.max(0, Number(rawAccount.points) || 0),
        level: Math.max(1, Number(rawAccount.level) || 1),
        current_xp: Math.max(0, Number(rawAccount.currentXp) || 0),
        next_level_xp: Math.max(100, Number(rawAccount.nextLevelXp) || 1000),
        badges_unlocked: Array.isArray(rawAccount.badgesUnlocked) ? rawAccount.badgesUnlocked.slice(0, 30) : ['BRONZE_GUARDIAN'],
        trip_history: Array.isArray(rawAccount.tripHistory) ? rawAccount.tripHistory.slice(0, 50) : [],
        account_data: {
          username: cleanUsername,
          fullName: cleanFullName,
          phone: cleanPhone,
          email: cleanEmail,
          city: cleanCity,
          stateProvince: cleanStateProvince,
          country: cleanCountry,
          preferredLanguage: cleanPreferredLanguage,
          unitSystem: cleanUnitSystem,
          parentName: cleanParentName,
          parentPhone: cleanParentPhone,
          parentEmail: cleanParentEmail,
          safetyScore: Math.min(100, Math.max(0, Number(rawAccount.safetyScore) || 100)),
          cleanTrips: Math.max(0, Number(rawAccount.cleanTrips) || 0),
          totalTrips: Math.max(0, Number(rawAccount.totalTrips) || 0),
          totalDistanceMiles: Math.max(0, Number(rawAccount.totalDistanceMiles) || 0),
          points: Math.max(0, Number(rawAccount.points) || 0),
          level: Math.max(1, Number(rawAccount.level) || 1),
          current_xp: Math.max(0, Number(rawAccount.currentXp) || 0),
          next_level_xp: Math.max(100, Number(rawAccount.nextLevelXp) || 1000),
          badgesUnlocked: Array.isArray(rawAccount.badgesUnlocked) ? rawAccount.badgesUnlocked.slice(0, 30) : ['BRONZE_GUARDIAN'],
          tripHistory: Array.isArray(rawAccount.tripHistory) ? rawAccount.tripHistory.slice(0, 50) : []
        },
        updated_at: new Date().toISOString()
      };

      const { data, error: upsertErr } = await supabase
        .from('driver_accounts')
        .upsert(payload, { onConflict: 'username' })
        .select();

      if (!upsertErr) {
        return res.status(200).json({
          status: 'success',
          account: payload.account_data,
          supabaseSaved: true,
          data
        });
      }

      // Fallback update/insert
      const { error: updateErr } = await supabase
        .from('driver_accounts')
        .update(payload)
        .eq('username', cleanUsername);

      if (!updateErr) {
        return res.status(200).json({
          status: 'success',
          account: payload.account_data,
          supabaseSaved: true,
          method: 'update'
        });
      }

      const { error: insertErr } = await supabase
        .from('driver_accounts')
        .insert(payload);

      if (!insertErr) {
        return res.status(200).json({
          status: 'success',
          account: payload.account_data,
          supabaseSaved: true,
          method: 'insert'
        });
      }

      return res.status(500).json({
        status: 'error',
        supabaseSaved: false,
        message: upsertErr.message || updateErr.message || insertErr.message
      });
    } catch (err: any) {
      console.error('Supabase write error:', err);
      return res.status(500).json({
        status: 'error',
        supabaseSaved: false,
        message: err.message || 'Supabase write failure'
      });
    }
  }

  if (req.method === 'DELETE') {
    if (!supabase) {
      return res.status(200).json({ status: 'success', message: 'Local reset complete' });
    }
    try {
      await supabase.from('driver_accounts').delete().neq('username', '__keep_schema__');
      return res.status(200).json({ status: 'success', message: 'All cloud accounts purged' });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
