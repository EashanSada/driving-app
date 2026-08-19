import React, { useState } from 'react';
import {
  History,
  X,
  Play,
  RotateCcw,
  Calendar,
  Clock,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  CloudSun,
  Moon,
  CheckCircle2,
  Download
} from 'lucide-react';
import { StoredTrip, TripBreadcrumb, UnitSystem } from '../types';
import { getStoredTrips } from '../lib/offlineTripStore';
import { getActiveUsername } from '../lib/accountManager';

interface TripHistoryReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitSystem: UnitSystem;
}

export const TripHistoryReplayModal: React.FC<TripHistoryReplayModalProps> = ({
  isOpen,
  onClose,
  unitSystem
}) => {
  const activeUsername = getActiveUsername();
  const trips = getStoredTrips(activeUsername || undefined);
  const [selectedTrip, setSelectedTrip] = useState<StoredTrip | null>(trips[0] || null);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  React.useEffect(() => {
    if (trips.length > 0 && !selectedTrip) {
      setSelectedTrip(trips[0]);
    }
  }, [trips.length]);

  React.useEffect(() => {
    let timer: any;
    if (isPlaying && selectedTrip && selectedTrip.breadcrumbs.length > 0) {
      timer = setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= selectedTrip.breadcrumbs.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, selectedTrip]);

  if (!isOpen) return null;

  const currentPoint: TripBreadcrumb | undefined =
    selectedTrip && selectedTrip.breadcrumbs.length > 0
      ? selectedTrip.breadcrumbs[replayIndex] || selectedTrip.breadcrumbs[0]
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="glass-card max-w-5xl w-full p-6 border border-[#2dd4bf]/30 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 flex items-center justify-center">
              <History className="w-5 h-5 text-[#2dd4bf]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">Trip History & Route Replay</h2>
              <p className="text-xs text-slate-400">
                Inspect recorded trips, speed compliance, and telematics breadcrumbs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 overflow-y-auto flex-1">
          {/* Left Column: Trip Selection List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-1">
              Logged Driving Sessions ({trips.length})
            </span>

            {trips.length === 0 ? (
              <div className="p-8 text-center bg-[#020617]/50 rounded-xl border border-white/10 space-y-2">
                <Gauge className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No trips logged yet. Complete a driving session on the HUD.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {trips.map((trip) => {
                  const isSelected = selectedTrip?.id === trip.id;
                  const dateStr = new Date(trip.startTime).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <button
                      key={trip.id}
                      onClick={() => {
                        setSelectedTrip(trip);
                        setReplayIndex(0);
                        setIsPlaying(false);
                      }}
                      className={`w-full p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-[#2dd4bf]/15 border-[#2dd4bf] shadow-lg'
                          : 'bg-[#020617]/60 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#2dd4bf]" /> {dateStr}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/30">
                          {trip.safetyScore} pts
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          {unitSystem === 'imperial'
                            ? `${trip.distanceMiles.toFixed(1)} mi`
                            : `${(trip.distanceMiles * 1.60934).toFixed(1)} km`}
                        </span>
                        <span>{Math.round(trip.durationSeconds / 60)} mins</span>
                        <span className="flex items-center gap-1">
                          {trip.isNightTrip ? (
                            <Moon className="w-3 h-3 text-[#a78bfa]" />
                          ) : (
                            <CloudSun className="w-3 h-3 text-amber-400" />
                          )}
                          {trip.weatherCondition}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Route Breadcrumb Replay & Telemetry Breakdown (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedTrip ? (
              <>
                {/* Trip Summary Top Banner */}
                <div className="p-4 rounded-xl bg-[#020617]/80 border border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Safety Score</span>
                      <span className="text-xl font-black font-mono text-[#2dd4bf]">
                        {selectedTrip.safetyScore} / 100
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Top Speed</span>
                      <span className="text-base font-bold font-mono text-white">
                        {unitSystem === 'imperial'
                          ? `${selectedTrip.topSpeedMph} mph`
                          : `${(selectedTrip.topSpeedMph * 1.60934).toFixed(0)} km/h`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Abrupt Maneuvers</span>
                      <span
                        className={`text-base font-bold font-mono ${
                          selectedTrip.harshBrakingCount + selectedTrip.harshCorneringCount === 0
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {selectedTrip.harshBrakingCount + selectedTrip.harshCorneringCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#2dd4bf] text-slate-950 font-bold text-xs hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-slate-950' : ''}`} />
                      <span>{isPlaying ? 'Pause Replay' : 'Play Route Replay'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setReplayIndex(0);
                        setIsPlaying(false);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
                      title="Reset to Start"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Visual Route Replay Canvas / Breadcrumbs Trail */}
                <div className="p-4 rounded-xl bg-[#020617] border border-white/10 relative space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#2dd4bf]" /> Route Telemetry Trail
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Waypoint {replayIndex + 1} of {selectedTrip.breadcrumbs.length || 1}
                    </span>
                  </div>

                  {/* Visual Stepper Breadcrumb Track */}
                  <div className="relative py-4">
                    <div className="w-full h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] transition-all duration-300"
                        style={{
                          width: `${
                            selectedTrip.breadcrumbs.length > 1
                              ? (replayIndex / (selectedTrip.breadcrumbs.length - 1)) * 100
                              : 100
                          }%`
                        }}
                      />
                    </div>

                    {/* Waypoint Dots */}
                    <div className="flex justify-between items-center mt-3 gap-1 overflow-x-auto py-1">
                      {selectedTrip.breadcrumbs.map((bc, idx) => (
                        <button
                          key={idx}
                          onClick={() => setReplayIndex(idx)}
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-mono transition-all cursor-pointer shrink-0 ${
                            idx === replayIndex
                              ? 'ring-2 ring-[#2dd4bf] bg-white text-slate-950 scale-125 z-10'
                              : bc.isHarsh
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-500'
                          }`}
                          title={`Waypoint ${idx + 1}: ${bc.speedMph} mph ${bc.isHarsh ? '(Abrupt Event)' : ''}`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Waypoint Telemetry Card */}
                  {currentPoint && (
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-medium">Logged Speed</span>
                        <span className="text-sm font-bold font-mono text-white">
                          {unitSystem === 'imperial'
                            ? `${currentPoint.speedMph} mph`
                            : `${(currentPoint.speedMph * 1.60934).toFixed(0)} km/h`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-medium">Posted Limit</span>
                        <span className="text-sm font-bold font-mono text-[#2dd4bf]">
                          {unitSystem === 'imperial'
                            ? `${currentPoint.speedLimitMph} mph`
                            : `${(currentPoint.speedLimitMph * 1.60934).toFixed(0)} km/h`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-medium">Coordinates</span>
                        <span className="text-xs font-mono text-slate-300">
                          {currentPoint.lat.toFixed(4)}, {currentPoint.lng.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-medium">Status</span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            currentPoint.isHarsh
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {currentPoint.isHarsh ? currentPoint.eventLabel || 'Sudden Force' : 'Smooth Pace'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center bg-[#020617]/50 rounded-xl border border-white/10">
                <p className="text-xs text-slate-400">Select a trip on the left to inspect its route replay.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
