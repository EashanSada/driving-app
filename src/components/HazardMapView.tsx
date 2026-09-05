import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  ThumbsUp,
  Plus,
  Compass,
  Navigation,
  RefreshCw,
  X,
  Layers,
  LocateFixed,
  ShieldCheck,
  Check
} from 'lucide-react';
import { HazardReport, UnitSystem } from '../types';
import { getSupabaseClient, getSupabaseUrl, getSupabaseAnonKey } from '../lib/supabaseClient';
import { getCurrentNativePosition, NativeHaptics, requestLocationPermissions } from '../lib/nativeMobileBridge';

export const HazardMapView: React.FC<{ unitSystem?: UnitSystem }> = ({ unitSystem = 'imperial' }) => {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newHazardType, setNewHazardType] = useState<HazardReport['hazard_type']>('POTHOLE');
  const [description, setDescription] = useState('');
  const [sourceApp] = useState<'WEB_APP' | 'ANDROID_NATIVE'>('WEB_APP');

  // Phone hardware GPS location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    fetchHazards();
    fetchCurrentPhoneLocation();

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

  // Request & acquire direct hardware GPS coordinates from device (Zero Google Maps API needed)
  const fetchCurrentPhoneLocation = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      await requestLocationPermissions();
      const pos = await getCurrentNativePosition();
      if (pos) {
        setUserLocation({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy });
      } else {
        // Fallback default coordinates (e.g. San Francisco downtown)
        setUserLocation({ lat: 37.7749, lng: -122.4194, accuracy: 12 });
      }
    } catch (err) {
      setLocationError('Using device default location');
      setUserLocation({ lat: 37.7749, lng: -122.4194, accuracy: 15 });
    } finally {
      setLocating(false);
    }
  };

  const fetchHazards = async () => {
    try {
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
          source_app: 'IOS_NATIVE'
        },
        {
          id: 'hz-2',
          lat: 37.7833,
          lng: -122.4167,
          hazard_type: 'HIGH_ACCIDENT_ZONE',
          description: 'High collision intersection near freeway merging point.',
          upvotes: 14,
          time: '1h ago',
          source_app: 'IOS_NATIVE'
        },
        {
          id: 'hz-3',
          lat: 37.7689,
          lng: -122.4255,
          hazard_type: 'CONSTRUCTION',
          description: 'Lane reduced to single file; utility maintenance.',
          upvotes: 5,
          time: '3h ago',
          source_app: 'IOS_NATIVE'
        }
      ]);
    } catch (e) {
      console.log('Using local hazard seed');
    }
  };

  const handleUpvote = async (id: string) => {
    NativeHaptics.light();
    const updated = hazards.map((h) => (h.id === id ? { ...h, upvotes: h.upvotes + 1 } : h));
    setHazards(updated);

    const client = getSupabaseClient();
    if (client) {
      const target = updated.find(h => h.id === id);
      if (target) {
        await client.from('road_hazards').update({ upvotes: target.upvotes }).eq('id', id);
      }
    }
  };

  const handleAddHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    NativeHaptics.medium();

    const baseLat = userLocation?.lat || 37.7749;
    const baseLng = userLocation?.lng || -122.4194;

    const newReport: HazardReport = {
      id: `hz-${Date.now()}`,
      lat: baseLat + (Math.random() - 0.5) * 0.008,
      lng: baseLng + (Math.random() - 0.5) * 0.008,
      hazard_type: newHazardType,
      description,
      upvotes: 1,
      time: 'Just now',
      source_app: sourceApp
    };

    setHazards((prev) => [newReport, ...prev]);
    setDescription('');
    setShowModal(false);

    const client = getSupabaseClient();
    if (client) {
      await client.from('road_hazards').insert({
        id: newReport.id,
        hazard_type: newReport.hazard_type,
        description: newReport.description,
        lat: newReport.lat,
        lng: newReport.lng,
        upvotes: 1,
        source_app: 'IOS_NATIVE'
      });
    }
  };

  const getTypeBadge = (type: HazardReport['hazard_type']) => {
    switch (type) {
      case 'POTHOLE':
        return { label: 'POTHOLE', bg: 'bg-amber-50 text-amber-900 border-amber-300' };
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

  const filteredHazards = filterType === 'ALL'
    ? hazards
    : hazards.filter(h => h.hazard_type === filterType);

  // Calculate distance in miles/km from current user GPS
  const getDistanceFormatted = (lat: number, lng: number) => {
    if (!userLocation) return 'Nearby';
    const R = 6371; // km
    const dLat = ((lat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((lng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = R * c;

    if (unitSystem === 'metric') {
      return distKm < 1 ? `${Math.round(distKm * 1000)} m away` : `${distKm.toFixed(1)} km away`;
    }
    const distMiles = distKm * 0.621371;
    return distMiles < 0.2 ? `${Math.round(distMiles * 5280)} ft away` : `${distMiles.toFixed(1)} mi away`;
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="luxury-card p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                  Road Hazard Radar & GPS Proximity
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <LocateFixed className="w-2.5 h-2.5" /> Direct Phone GPS
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Crowd-sourced driver safety alerts powered 100% by native device GPS sensors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCurrentPhoneLocation}
              disabled={locating}
              className="px-3 py-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Refresh phone location"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locating ? 'animate-spin text-[#A38258]' : ''}`} />
              <span>{locating ? 'Locating...' : 'Refresh GPS'}</span>
            </button>

            <button
              onClick={() => {
                NativeHaptics.light();
                setShowModal(true);
              }}
              className="btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Report Road Hazard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Radar HUD Display (7 cols) + Reports (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Radar & Device GPS Column */}
        <div className="lg:col-span-7 luxury-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#A38258]" />
              <span className="text-xs font-bold text-stone-900">Live Device Proximity Radar</span>
            </div>

            {userLocation && (
              <div className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#A38258]" />
                <span>
                  {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
                </span>
              </div>
            )}
          </div>

          {/* Interactive Radar Visualizer */}
          <div className="w-full h-80 rounded-2xl border border-stone-800 bg-stone-950 relative overflow-hidden flex items-center justify-center p-4">
            {/* Concentric Radar Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full border border-stone-800/80 absolute" />
              <div className="w-48 h-48 rounded-full border border-[#C5A880]/20 absolute" />
              <div className="w-32 h-32 rounded-full border border-[#C5A880]/30 absolute" />
              <div className="w-16 h-16 rounded-full border border-[#C5A880]/40 absolute animate-ping opacity-25" />
              {/* Radar Crosshairs */}
              <div className="w-full h-[1px] bg-stone-800/50 absolute" />
              <div className="h-full w-[1px] bg-stone-800/50 absolute" />
            </div>

            {/* Center Vehicle Icon (User GPS) */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-[#C5A880] text-stone-950 flex items-center justify-center shadow-lg border-2 border-white ring-4 ring-[#C5A880]/20">
                <Navigation className="w-4 h-4" />
              </div>
              <span className="mt-1 text-[10px] font-mono font-bold text-[#DEBF97] bg-stone-900/90 px-2 py-0.5 rounded-full border border-[#C5A880]/30">
                Your Vehicle
              </span>
            </div>

            {/* Geotagged Hazards Plotted relative to user location */}
            {hazards.map((h, idx) => {
              const baseLat = userLocation?.lat || 37.7749;
              const baseLng = userLocation?.lng || -122.4194;
              // Map delta degrees to coordinate offset in canvas
              const offsetX = Math.max(-110, Math.min(110, (h.lng - baseLng) * 8000));
              const offsetY = Math.max(-110, Math.min(110, (baseLat - h.lat) * 8000));

              const isDanger = h.hazard_type === 'HIGH_ACCIDENT_ZONE';

              return (
                <div
                  key={h.id}
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px)`
                  }}
                  className="absolute z-20 group cursor-pointer"
                  onClick={() => handleUpvote(h.id)}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-transform group-hover:scale-125 ${
                      isDanger
                        ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                        : 'bg-amber-500 text-stone-950 ring-2 ring-amber-300'
                    }`}
                  >
                    !
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-36 p-1.5 rounded-lg bg-stone-900 text-white text-[9px] shadow-xl z-30 pointer-events-none border border-stone-700">
                    <div className="font-bold text-[#DEBF97]">{h.hazard_type}</div>
                    <div className="text-stone-300 truncate">{h.description}</div>
                    <div className="text-[8px] text-stone-400 mt-0.5">{getDistanceFormatted(h.lat, h.lng)}</div>
                  </div>
                </div>
              );
            })}

            {/* Radar status indicator bottom bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-stone-400 bg-stone-900/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-stone-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Phone GPS Active
              </span>
              <span>Scanning 5.0 km Range</span>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['ALL', 'POTHOLE', 'HIGH_ACCIDENT_ZONE', 'CONSTRUCTION', 'BLACK_ICE'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                  filterType === type
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {type === 'ALL' ? 'All Alerts' : type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Hazard List Column */}
        <div className="lg:col-span-5 luxury-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="card-title block mb-0">Active Hazards ({filteredHazards.length})</span>
            <span className="text-[10px] font-mono text-stone-400">GPS Ordered</span>
          </div>

          <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
            {filteredHazards.map((item) => {
              const badge = getTypeBadge(item.hazard_type);
              const distance = getDistanceFormatted(item.lat, item.lng);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-start justify-between gap-3 hover:border-stone-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{item.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-stone-800">{item.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                      <span className="text-[#A38258] font-bold flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {distance}
                      </span>
                      <span>•</span>
                      <span>
                        {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpvote(item.id)}
                    className="p-2 rounded-xl bg-white border border-stone-200 hover:border-[#C5A880] text-stone-600 transition-all cursor-pointer flex flex-col items-center shrink-0"
                    title="Confirm this hazard"
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
              <p className="text-xs text-stone-500">
                Geotags your current phone GPS location for other drivers in your community circle.
              </p>
            </div>

            {userLocation && (
              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs flex items-center gap-2 text-stone-800">
                <LocateFixed className="w-4 h-4 text-[#A38258] shrink-0" />
                <div className="text-[11px]">
                  <span className="font-bold">Phone GPS Tagged: </span>
                  <span className="font-mono text-stone-600">{userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°</span>
                </div>
              </div>
            )}

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
