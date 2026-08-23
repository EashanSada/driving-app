import React, { useState } from 'react';
import {
  History,
  X,
  Play,
  RotateCcw,
  Gauge,
  CheckCircle2
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

  const isImperial = unitSystem === 'imperial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="luxury-card max-w-5xl w-full p-6 border border-[#C5A880]/30 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden text-stone-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-display">Trip Logbook & Kinematics Replay</h2>
              <p className="text-xs text-stone-500">
                Inspect recorded trips, speed compliance, and telematics telemetry breadcrumbs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 overflow-y-auto flex-1">
          {/* Left Column: Trip List (4 cols) */}
          <div className="lg:col-span-4 space-y-2.5">
            <span className="card-title block mb-1">
              Driving Sessions ({trips.length})
            </span>

            {trips.length === 0 ? (
              <div className="p-6 text-center bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 space-y-1">
                <History className="w-6 h-6 text-stone-400 mx-auto" />
                <p>No driving trips recorded yet. Complete a session on the HUD to generate logs.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {trips.map((trip) => {
                  const isSelected = selectedTrip?.id === trip.id;
                  const distDisplay = isImperial
                    ? `${trip.distanceMiles.toFixed(1)} mi`
                    : `${(trip.distanceMiles * 1.60934).toFixed(1)} km`;
                  const dateStr = new Date(trip.startTime).toLocaleDateString();
                  const timeStr = new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const durationMins = Math.round(trip.durationSeconds / 60);

                  return (
                    <div
                      key={trip.id}
                      onClick={() => {
                        setSelectedTrip(trip);
                        setReplayIndex(0);
                        setIsPlaying(false);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-white border-[#C5A880] shadow-md'
                          : 'bg-stone-50 border-stone-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">{dateStr} • {timeStr}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {trip.safetyScore} pts
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
                        <span>{distDisplay}</span>
                        <span>{durationMins} mins</span>
                        <span>{trip.isNightTrip ? 'Night' : 'Day'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Replay & Metrics (8 cols) */}
          {selectedTrip && (
            <div className="lg:col-span-8 space-y-4">
              {/* Trip Overview Metric Card */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Session Rating:</span>
                    <span className="text-lg font-black text-stone-900 font-display">
                      {selectedTrip.safetyScore} / 100
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Defensive Standard
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-stone-100">
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Distance</span>
                    <span className="text-xs font-bold font-mono text-stone-900">
                      {isImperial
                        ? `${selectedTrip.distanceMiles.toFixed(1)} mi`
                        : `${(selectedTrip.distanceMiles * 1.60934).toFixed(1)} km`}
                    </span>
                  </div>
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Harsh Events</span>
                    <span className="text-xs font-bold font-mono text-stone-900">
                      {selectedTrip.harshBrakingCount + selectedTrip.harshCorneringCount}
                    </span>
                  </div>
                  <div className="p-2 bg-stone-50 rounded-lg">
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Top Speed</span>
                    <span className="text-xs font-bold font-mono text-stone-900">
                      {isImperial ? `${selectedTrip.topSpeedMph} MPH` : `${Math.round(selectedTrip.topSpeedMph * 1.60934)} KM/H`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Breadcrumb Playback Bar */}
              {selectedTrip.breadcrumbs && selectedTrip.breadcrumbs.length > 0 && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-[#A38258]" /> Route Telemetry Timeline
                    </span>
                    <span className="text-xs font-mono text-stone-500">
                      Step {replayIndex + 1} of {selectedTrip.breadcrumbs.length}
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C5A880] transition-all"
                      style={{
                        width: `${((replayIndex + 1) / selectedTrip.breadcrumbs.length) * 100}%`
                      }}
                    />
                  </div>

                  {currentPoint && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="font-mono font-bold text-stone-900">
                        Speed: {isImperial ? currentPoint.speedMph.toFixed(0) : (currentPoint.speedMph * 1.60934).toFixed(0)} {isImperial ? 'MPH' : 'KM/H'}
                      </div>
                      <div className="font-mono text-stone-600">
                        Speed Limit: {currentPoint.speedLimitMph} MPH
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setReplayIndex(0)}
                      className="p-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-stone-950" />
                      <span>{isPlaying ? 'Pause Replay' : 'Play Timeline'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
