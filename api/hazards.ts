import { createClient } from '@supabase/supabase-js';
import { applySecurityHeaders, enforceRateLimit, sanitizeString, sanitizeCoordinates } from './_security';

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
      return createClient(url, key, { auth: { persistSession: false } });
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting (40 requests per minute per IP)
  const rateLimitCheck = enforceRateLimit(req, 'hazards', 40, 60 * 1000);
  if (!rateLimitCheck.allowed) {
    return res.status(rateLimitCheck.statusCode || 429).json({
      status: 'error',
      message: rateLimitCheck.message
    });
  }

  const supabase = getSupabaseServerClient(req);

  if (req.method === 'GET') {
    if (!supabase) {
      return res.status(200).json({ status: 'success', hazards: [], source: 'unconfigured' });
    }

    try {
      const { data, error } = await supabase
        .from('road_hazards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      const hazards = (data || []).map((item: any) => ({
        id: item.id,
        hazard_type: item.hazard_type,
        description: item.description,
        lat: Number(item.lat),
        lng: Number(item.lng),
        upvotes: Number(item.upvotes) || 1,
        time: 'Recently reported',
        source_app: item.source_app || 'WEB_APP'
      }));

      return res.status(200).json({ status: 'success', hazards, source: 'supabase' });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to fetch hazards' });
    }
  }

  if (req.method === 'POST') {
    const raw = req.body || {};
    const cleanId = sanitizeString(raw.id || `hz_${Date.now()}`, 50);
    const cleanType = sanitizeString(raw.hazard_type || 'POTHOLE', 30);
    const cleanDesc = sanitizeString(raw.description || '', 200);
    const coords = sanitizeCoordinates(raw.lat, raw.lng);

    if (!cleanType || !cleanDesc || !coords) {
      return res.status(400).json({ status: 'error', message: 'Invalid hazard payload or coordinates' });
    }

    if (!supabase) {
      return res.status(503).json({ status: 'error', supabaseSaved: false, message: 'Supabase client not initialized' });
    }

    try {
      const { error } = await supabase.from('road_hazards').insert({
        id: cleanId,
        hazard_type: cleanType,
        description: cleanDesc,
        lat: coords.lat,
        lng: coords.lng,
        upvotes: Math.max(1, Math.min(1000, Number(raw.upvotes) || 1)),
        source_app: sanitizeString(raw.source_app || 'WEB_APP', 20)
      });

      if (error) {
        return res.status(500).json({ status: 'error', supabaseSaved: false, message: error.message });
      }

      return res.status(200).json({ status: 'success', supabaseSaved: true, hazardId: cleanId });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', supabaseSaved: false, message: err.message || 'Insert error' });
    }
  }

  if (req.method === 'PUT') {
    const raw = req.body || {};
    const cleanId = sanitizeString(raw.id, 50);
    const upvotes = Number(raw.upvotes);

    if (!cleanId || isNaN(upvotes)) {
      return res.status(400).json({ status: 'error', message: 'Invalid upvote payload' });
    }

    if (!supabase) {
      return res.status(503).json({ status: 'error', supabaseSaved: false, message: 'Supabase not configured' });
    }

    try {
      const { error } = await supabase
        .from('road_hazards')
        .update({ upvotes: Math.max(1, Math.min(10000, upvotes)) })
        .eq('id', cleanId);

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      return res.status(200).json({ status: 'success', supabaseSaved: true });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Update error' });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
