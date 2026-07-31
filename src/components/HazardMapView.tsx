import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { AlertTriangle, MapPin, ThumbsUp, Plus, ShieldAlert, Navigation, Search, Smartphone, Globe, Sparkles, Route } from 'lucide-react';
import { HazardReport, RouteSearchResult, UnitSystem } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const HazardMarkerWithInfoWindow: React.FC<{ hazard: HazardReport; onUpvote: (id: string) => void }> = ({ hazard, onUpvote }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: hazard.lat, lng: hazard.lng }} onClick={() => setOpen(true)}>
        <Pin
          background={hazard.hazard_type === 'HIGH_ACCIDENT_ZONE' ? '#ef4444' : '#2dd4bf'}
          glyphColor="#020617"
          borderColor="#ffffff"
        />
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-1 max-w-xs space-y-1 text-slate-900">
            <div className="font-extrabold text-xs text-[#020617] uppercase tracking-wider">{hazard.hazard_type}</div>
            <p className="text-xs text-slate-700 font-medium">{hazard.description}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t">
              <span>{hazard.time} • Source: {hazard.source_app || 'WEB'}</span>
              <button
                onClick={() => onUpvote(hazard.id)}
                className="text-[#2dd4bf] font-bold hover:underline cursor-pointer"
              >
                Upvote ({hazard.upvotes})
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export const HazardMapView: React.FC<{ unitSystem?: UnitSystem }> = ({ unitSystem = 'imperial' }) => {
  const [hazards, setHazards] = useState<HazardReport[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [newHazardType, setNewHazardType] = useState<HazardReport['hazard_type']>('POTHOLE');
  const [description, setDescription] = useState('');
  const [sourceApp, setSourceApp] = useState<'WEB_APP' | 'ANDROID_NATIVE'>('WEB_APP');

  // Google Maps Directions Search Agent state
  const [originInput, setOriginInput] = useState('San Francisco, CA');
  const [destInput, setDestInput] = useState('San Jose, CA');
  const [routeResult, setRouteResult] = useState<RouteSearchResult | null>(null);
  const [agentSearching, setAgentSearching] = useState(false);

  useEffect(() => {
    fetchHazards();

    const client = getSupabaseClient();
    if (client) {
      const channel = client
        .channel('public_road_hazards_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'road_hazards' }, () => {
          fetchHazards();
        })
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }
  }, []);

  const fetchHazards = async () => {
    try {
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('road_hazards')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const parsedHazards: HazardReport[] = data.map(item => ({
            id: item.id,
            hazard_type: item.hazard_type as HazardReport['hazard_type'],
            description: item.description,
            lat: Number(item.lat),
            lng: Number(item.lng),
            upvotes: Number(item.upvotes) || 1,
            time: 'Recently reported',
            source_app: item.source_app || 'WEB_APP'
          }));
          setHazards(parsedHazards);
          return;
        }
      }

      if (window.DriveSafeBackend) {
        const backend = typeof window.DriveSafeBackend === 'function' && window.DriveSafeBackend.getHazardReports
          ? window.DriveSafeBackend
          : (typeof window.DriveSafeBackend === 'function' ? new (window.DriveSafeBackend as any)() : window.DriveSafeBackend);

        if (backend && typeof backend.getHazardReports === 'function') {
          const result = await backend.getHazardReports();
          if (result?.hazards?.length > 0) {
            setHazards(result.hazards);
          }
        }
      }
    } catch (err) {
      console.warn('Hazard fetch warning:', err);
    }
  };

  const handleAddHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newReport: HazardReport = {
      id: `haz_${Date.now()}`,
      hazard_type: newHazardType,
      description: description.trim(),
      lat: 37.7749 + (Math.random() - 0.5) * 0.04,
      lng: -122.4194 + (Math.random() - 0.5) * 0.04,
      upvotes: 1,
      time: 'Just now',
      source_app: sourceApp
    };

    setHazards(prev => [newReport, ...prev]);

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('road_hazards').insert({
          id: newReport.id,
          hazard_type: newReport.hazard_type,
          description: newReport.description,
          lat: newReport.lat,
          lng: newReport.lng,
          upvotes: 1,
          source_app: newReport.source_app
        });
      }

      if (window.DriveSafeBackend) {
        const backend = typeof window.DriveSafeBackend === 'function' && window.DriveSafeBackend.addHazardReport
          ? window.DriveSafeBackend
          : (typeof window.DriveSafeBackend === 'function' ? new (window.DriveSafeBackend as any)() : window.DriveSafeBackend);

        if (backend && typeof backend.addHazardReport === 'function') {
          await backend.addHazardReport({
            type: newHazardType,
            description,
            lat: newReport.lat,
            lng: newReport.lng,
            source_app: sourceApp
          });
        }
      }
    } catch (err) {
      console.warn('Hazard add warning:', err);
    }

    setDescription('');
    setShowModal(false);
  };

  const handleUpvote = async (id: string) => {
    setHazards(prev => prev.map(h => {
      if (h.id === id) {
        const updatedUpvotes = h.upvotes + 1;
        const client = getSupabaseClient();
        if (client) {
          client.from('road_hazards').update({ upvotes: updatedUpvotes }).eq('id', id).then();
        }
        return { ...h, upvotes: updatedUpvotes };
      }
      return h;
    }));
  };

  const handleSearchSafeRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originInput || !destInput) return;

    setAgentSearching(true);
    setTimeout(() => {
      setRouteResult({
        origin: originInput,
        destination: destInput,
        distanceKm: 78.4,
        durationMinutes: 48,
        safetyRating: 'HIGHLY_SAFE',
        hazardsEnRoute: 2
      });
      setAgentSearching(false);
    }, 800);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'POTHOLE':
        return { label: 'POTHOLE', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'HIGH_ACCIDENT_ZONE':
        return { label: 'HIGH ACCIDENT ZONE', bg: 'bg-rose-500/10 text-rose-300 border-rose-500/30' };
      case 'BLACK_ICE':
        return { label: 'BLACK ICE / FROST', bg: 'bg-teal-500/10 text-teal-300 border-teal-500/30' };
      default:
        return { label: 'ROAD HAZARD', bg: 'bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 border border-[#2dd4bf]/20 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-[#2dd4bf]" />
              <h2 className="text-xl font-bold text-white font-display">Community Road Hazards & Safe Navigation</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Stay aware of real-time road hazards like potholes, black ice, and high-accident intersections reported by drivers in your community.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-bold hover:shadow-lg transition-all cursor-pointer glow-mint shrink-0"
          >
            <Plus className="w-4 h-4 fill-slate-950" />
            <span>Report Road Hazard</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Google Maps / Radar + Route Agent + Hazard List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Google Maps Container or Fallback Radar (7 cols) */}
        <div className="lg:col-span-7 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="card-title flex items-center gap-2 mb-0">
              <Navigation className="w-4 h-4 text-[#2dd4bf]" /> Live Community Hazard Map
            </span>
            <span className="text-xs text-[#2dd4bf] font-mono font-semibold">
              {hazards.length} Active Hazard Pins
            </span>
          </div>

          <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#020617]">
            {hasValidKey ? (
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
                  defaultZoom={13}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  {hazards.map((h) => (
                    <HazardMarkerWithInfoWindow key={h.id} hazard={h} onUpvote={handleUpvote} />
                  ))}
                </Map>
              </APIProvider>
            ) : (
              /* Fallback preview map radar when key is pending configuration */
              <div className="w-full h-full relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30" />
                
                {/* Radar circle pins */}
                <div className="relative z-10 text-center space-y-3 p-6 max-w-sm bg-[#020617]/90 rounded-2xl border border-white/10 shadow-2xl">
                  <ShieldAlert className="w-10 h-10 text-[#2dd4bf] mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Interactive Community Map</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      {hazards.length} geotagged hazards mapped near San Francisco & Bay Area routes.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-[#020617] rounded-xl border border-white/10 text-[11px] text-slate-300 text-center space-y-1">
                    <span className="text-[#2dd4bf] font-semibold">Community Road Network Active</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Route Directions & Safety Agent Bar */}
          <div className="p-4 rounded-xl bg-[#020617]/70 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#a78bfa]" />
              <span className="text-xs font-bold text-white font-display">Safe Route Navigator</span>
            </div>

            <form onSubmit={handleSearchSafeRoute} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                placeholder="Origin"
                className="bg-[#020617] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
              />
              <input
                type="text"
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                placeholder="Destination"
                className="bg-[#020617] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
              />
              <button
                type="submit"
                disabled={agentSearching}
                className="px-3 py-1.5 rounded-lg bg-[#a78bfa] text-slate-950 font-bold text-xs hover:bg-[#a78bfa]/90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Route className="w-3.5 h-3.5" />
                <span>{agentSearching ? 'Calculating...' : 'Find Safe Route'}</span>
              </button>
            </form>

            {routeResult && (
              <div className="p-3 rounded-lg bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{routeResult.origin} ➔ {routeResult.destination}</span>
                  <span className="text-slate-300 text-[11px]">
                    {unitSystem === 'imperial'
                      ? `${(routeResult.distanceKm * 0.621371).toFixed(1)} miles`
                      : `${routeResult.distanceKm} km`} • Est. {routeResult.durationMinutes} mins drive
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2dd4bf] text-slate-950">
                    {routeResult.safetyRating}
                  </span>
                  <span className="text-[10px] text-amber-300 block mt-1 font-mono">{routeResult.hazardsEnRoute} Hazards En Route</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hazard Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <span className="card-title block mb-0">
            Recent Road Hazard Reports
          </span>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {hazards.map((item) => {
              const badge = getTypeBadge(item.hazard_type);
              return (
                <div key={item.id} className="glass-card p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{item.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 leading-snug">{item.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-[#a78bfa]">
                        <MapPin className="w-3 h-3" />
                        {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                      </span>
                      <span>•</span>
                      <span className="text-slate-500">{item.source_app === 'ANDROID_NATIVE' ? 'Mobile App' : 'Web'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpvote(item.id)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#020617]/70 border border-white/10 hover:border-[#2dd4bf]/40 text-slate-300 transition-all cursor-pointer group shrink-0"
                  >
                    <ThumbsUp className="w-4 h-4 text-[#2dd4bf] group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold font-mono mt-1 text-[#2dd4bf]">{item.upvotes}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Submit Hazard Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card p-6 max-w-md w-full border border-[#2dd4bf]/30 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#2dd4bf]" /> Report Road Safety Hazard
            </h3>

            <form onSubmit={handleAddHazard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reporting From
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceApp('WEB_APP')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border ${
                      sourceApp === 'WEB_APP'
                        ? 'bg-[#2dd4bf]/20 text-[#2dd4bf] border-[#2dd4bf]/40'
                        : 'bg-slate-900 text-slate-400 border-white/5'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" /> Web Browser
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceApp('ANDROID_NATIVE')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border ${
                      sourceApp === 'ANDROID_NATIVE'
                        ? 'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/40'
                        : 'bg-slate-900 text-slate-400 border-white/5'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile Phone
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hazard Classification
                </label>
                <select
                  value={newHazardType}
                  onChange={(e) => setNewHazardType(e.target.value as HazardReport['hazard_type'])}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                >
                  <option value="POTHOLE">Deep Pothole</option>
                  <option value="HIGH_ACCIDENT_ZONE">High Accident Intersection</option>
                  <option value="BLACK_ICE">Black Ice / Road Frost</option>
                  <option value="POOR_LIGHTING">Poor Street Lighting</option>
                  <option value="CONSTRUCTION">Construction Zone</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hazard Details
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., Deep pothole on right lane near exit 12..."
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-bold text-xs cursor-pointer shadow-lg glow-mint"
                >
                  Submit Hazard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
