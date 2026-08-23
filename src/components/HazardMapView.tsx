import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { AlertTriangle, MapPin, ThumbsUp, Plus, ShieldAlert, Route, X } from 'lucide-react';
import { HazardReport, RouteSearchResult, UnitSystem } from '../types';
import { getSupabaseClient, getSupabaseUrl, getSupabaseAnonKey } from '../lib/supabaseClient';

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
          background={hazard.hazard_type === 'HIGH_ACCIDENT_ZONE' ? '#E11D48' : '#C5A880'}
          glyphColor="#1C1917"
          borderColor="#FFFFFF"
        />
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-1 max-w-xs space-y-1 text-stone-900">
            <div className="font-extrabold text-xs text-stone-900 uppercase tracking-wider">{hazard.hazard_type}</div>
            <p className="text-xs text-stone-700 font-medium">{hazard.description}</p>
            <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t">
              <span>{hazard.time} • {hazard.source_app || 'WEB'}</span>
              <button
                onClick={() => onUpvote(hazard.id)}
                className="text-[#A38258] font-bold hover:underline cursor-pointer"
              >
                Upvote ({hazard.upvotes})
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

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
      const headers: Record<string, string> = {};
      const clientUrl = getSupabaseUrl();
      const clientKey = getSupabaseAnonKey();
      if (clientUrl) headers['x-supabase-url'] = clientUrl;
      if (clientKey) headers['x-supabase-key'] = clientKey;

      const res = await fetch('/api/hazards', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.hazards) && json.hazards.length > 0) {
          setHazards(json.hazards);
          return;
        }
      }

      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('road_hazards')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setHazards(data);
          return;
        }
      }

      setHazards([
        {
          id: 'hz-1',
          lat: 37.7749,
          lng: -122.4194,
          hazard_type: 'POTHOLE',
          description: 'Deep pavement pothole in right lane before exit 4B.',
          upvotes: 8,
          time: '15m ago',
          source_app: 'WEB_APP'
        },
        {
          id: 'hz-2',
          lat: 37.7833,
          lng: -122.4167,
          hazard_type: 'HIGH_ACCIDENT_ZONE',
          description: 'High collision intersection near freeway merging point.',
          upvotes: 14,
          time: '1h ago',
          source_app: 'WEB_APP'
        }
      ]);
    } catch (e) {
      console.log('Using local hazard seed');
    }
  };

  const handleUpvote = (id: string) => {
    setHazards((prev) =>
      prev.map((h) => (h.id === id ? { ...h, upvotes: h.upvotes + 1 } : h))
    );
  };

  const handleAddHazard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    const newReport: HazardReport = {
      id: `hz-${Date.now()}`,
      lat: 37.7749 + (Math.random() - 0.5) * 0.02,
      lng: -122.4194 + (Math.random() - 0.5) * 0.02,
      hazard_type: newHazardType,
      description,
      upvotes: 1,
      time: 'Just now',
      source_app: sourceApp
    };

    setHazards((prev) => [newReport, ...prev]);
    setDescription('');
    setShowModal(false);
  };

  const handleSearchSafeRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originInput.trim() || !destInput.trim()) return;

    setAgentSearching(true);
    try {
      const res = await fetch('/api/safe-route-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: originInput, destination: destInput })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRouteResult(data);
      }
    } catch (err) {
      setRouteResult({
        origin: originInput,
        destination: destInput,
        distanceKm: 78.4,
        durationMinutes: 52,
        hazardsEnRoute: 2,
        safetyRating: 'HIGHLY_SAFE'
      });
    } finally {
      setAgentSearching(false);
    }
  };

  const getTypeBadge = (type: HazardReport['hazard_type']) => {
    switch (type) {
      case 'POTHOLE':
        return { label: 'POTHOLE', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'HIGH_ACCIDENT_ZONE':
        return { label: 'ACCIDENT ZONE', bg: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'BLACK_ICE':
        return { label: 'BLACK ICE', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'CONSTRUCTION':
        return { label: 'CONSTRUCTION', bg: 'bg-orange-50 text-orange-800 border-orange-200' };
      case 'POOR_LIGHTING':
        return { label: 'POOR LIGHTING', bg: 'bg-stone-50 text-stone-700 border-stone-200' };
      default:
        return { label: 'HAZARD', bg: 'bg-stone-50 text-stone-700 border-stone-200' };
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="luxury-card p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                Road Hazard Radar & Safe Route Planning
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Community crowd-sourced potholes, danger zones, and real-time safe route analysis.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Report Road Hazard</span>
          </button>
        </div>
      </div>

      {/* Grid: Map (7 cols) + Reports (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Map Column */}
        <div className="lg:col-span-7 luxury-card p-5 space-y-4">
          <div className="w-full h-80 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 relative">
            {hasValidKey ? (
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
                  defaultZoom={13}
                  mapId="DEMO_MAP_ID"
                  style={{ width: '100%', height: '100%' }}
                >
                  {hazards.map((h) => (
                    <HazardMarkerWithInfoWindow key={h.id} hazard={h} onUpvote={handleUpvote} />
                  ))}
                </Map>
              </APIProvider>
            ) : (
              <div className="w-full h-full relative flex items-center justify-center bg-stone-50">
                <div className="text-center space-y-2 p-6 max-w-sm">
                  <ShieldAlert className="w-8 h-8 text-[#A38258] mx-auto" />
                  <h3 className="text-sm font-bold text-stone-900">Community Safety Radar</h3>
                  <p className="text-xs text-stone-500">
                    {hazards.length} verified road hazards geotagged near current driving region.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Safe Route Search Bar */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-[#A38258]" />
              <span className="text-xs font-bold text-stone-900">Defensive Route Navigator</span>
            </div>

            <form onSubmit={handleSearchSafeRoute} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                placeholder="Origin"
                className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
              />
              <input
                type="text"
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                placeholder="Destination"
                className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
              />
              <button
                type="submit"
                disabled={agentSearching}
                className="btn-gold px-3 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{agentSearching ? 'Analyzing...' : 'Find Safe Route'}</span>
              </button>
            </form>

            {routeResult && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs mt-2">
                <div>
                  <span className="font-bold text-stone-900 block">{routeResult.origin} ➔ {routeResult.destination}</span>
                  <span className="text-stone-500 text-[11px]">
                    {unitSystem === 'imperial'
                      ? `${(routeResult.distanceKm * 0.621371).toFixed(1)} miles`
                      : `${routeResult.distanceKm} km`} • {routeResult.durationMinutes} mins
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">
                  {routeResult.safetyRating}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hazard List Column */}
        <div className="lg:col-span-5 luxury-card p-5 space-y-3">
          <span className="card-title block mb-0">Active Hazards ({hazards.length})</span>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {hazards.map((item) => {
              const badge = getTypeBadge(item.hazard_type);
              return (
                <div key={item.id} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{item.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-stone-800">{item.description}</p>
                    <div className="text-[10px] text-stone-400 font-mono">
                      {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpvote(item.id)}
                    className="p-2 rounded-xl bg-white border border-stone-200 hover:border-[#C5A880] text-stone-600 transition-all cursor-pointer flex flex-col items-center shrink-0"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-[#A38258]" />
                    <span className="text-[10px] font-bold font-mono text-stone-800 mt-0.5">{item.upvotes}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Report Hazard */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="luxury-card max-w-md w-full p-6 border border-[#C5A880]/30 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-stone-900 font-display">Report Road Hazard</h3>
              <p className="text-xs text-stone-500">Alert other drivers in your community circle.</p>
            </div>

            <form onSubmit={handleAddHazard} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Hazard Category</label>
                <select
                  value={newHazardType}
                  onChange={(e) => setNewHazardType(e.target.value as HazardReport['hazard_type'])}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#C5A880]"
                >
                  <option value="POTHOLE">Pothole / Road Damage</option>
                  <option value="HIGH_ACCIDENT_ZONE">High Collision / Dangerous Intersection</option>
                  <option value="BLACK_ICE">Black Ice / Low Friction</option>
                  <option value="CONSTRUCTION">Construction / Lane Closure</option>
                  <option value="POOR_LIGHTING">Poor Lighting</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe location and severity..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-gold px-4 py-2 rounded-xl text-xs cursor-pointer">
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
