import { createClient } from '@supabase/supabase-js';

const inMemoryHazards: any[] = [];

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseServerClient();

  if (req.method === 'GET') {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('road_hazards')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const hazards = data.map((item: any) => ({
            id: item.id,
            hazard_type: item.hazard_type,
            description: item.description,
            lat: Number(item.lat),
            lng: Number(item.lng),
            upvotes: Number(item.upvotes) || 1,
            time: 'Recently reported',
            source_app: item.source_app || 'WEB_APP'
          }));
          return res.status(200).json({ status: 'success', hazards });
        }
      } catch (err) {
        console.warn('Server Supabase fetch hazards error:', err);
      }
    }

    return res.status(200).json({ status: 'success', hazards: inMemoryHazards });
  }

  if (req.method === 'POST') {
    const report = req.body || {};
    if (!report.id || !report.hazard_type || !report.description) {
      return res.status(400).json({ status: 'error', message: 'Invalid hazard payload' });
    }

    inMemoryHazards.unshift(report);

    if (supabase) {
      try {
        await supabase.from('road_hazards').insert({
          id: report.id,
          hazard_type: report.hazard_type,
          description: report.description,
          lat: Number(report.lat),
          lng: Number(report.lng),
          upvotes: Number(report.upvotes) || 1,
          source_app: report.source_app || 'WEB_APP'
        });
      } catch (err) {
        console.warn('Server Supabase insert hazard warning:', err);
      }
    }

    return res.status(200).json({ status: 'success', report });
  }

  if (req.method === 'PUT') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });

    const item = inMemoryHazards.find(h => h.id === id);
    if (item) {
      item.upvotes = (item.upvotes || 1) + 1;
    }

    if (supabase) {
      try {
        if (item) {
          await supabase.from('road_hazards').update({ upvotes: item.upvotes }).eq('id', id);
        }
      } catch (err) {
        console.warn('Server Supabase update hazard upvotes warning:', err);
      }
    }

    return res.status(200).json({ status: 'success', id });
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
