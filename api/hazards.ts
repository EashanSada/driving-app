import { createClient } from '@supabase/supabase-js';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-supabase-url, x-supabase-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
        .order('created_at', { ascending: false });

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
    const report = req.body || {};
    if (!report.id || !report.hazard_type || !report.description) {
      return res.status(400).json({ status: 'error', message: 'Invalid hazard payload' });
    }

    if (!supabase) {
      return res.status(503).json({ status: 'error', supabaseSaved: false, message: 'Supabase client not initialized' });
    }

    try {
      const { error } = await supabase.from('road_hazards').insert({
        id: report.id,
        hazard_type: report.hazard_type,
        description: report.description,
        lat: Number(report.lat),
        lng: Number(report.lng),
        upvotes: Number(report.upvotes) || 1,
        source_app: report.source_app || 'WEB_APP'
      });

      if (error) {
        return res.status(500).json({ status: 'error', supabaseSaved: false, message: error.message });
      }

      return res.status(200).json({ status: 'success', report, supabaseSaved: true });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', supabaseSaved: false, message: err.message });
    }
  }

  if (req.method === 'PUT') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });

    if (!supabase) {
      return res.status(503).json({ status: 'error', message: 'Supabase client not initialized' });
    }

    try {
      const { data: existing } = await supabase.from('road_hazards').select('upvotes').eq('id', id).single();
      const currentUpvotes = existing ? (existing.upvotes || 1) + 1 : 2;

      const { error } = await supabase.from('road_hazards').update({ upvotes: currentUpvotes }).eq('id', id);
      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      return res.status(200).json({ status: 'success', id, upvotes: currentUpvotes });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
