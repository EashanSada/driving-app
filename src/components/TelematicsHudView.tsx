import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Square,
  Gauge,
  Compass,
  History,
  ShieldCheck
} from 'lucide-react';
import { TelematicsState, LanguageCode, UnitSystem } from '../types';
import { recordTripForActiveUser, getActiveUsername, getAccount } from '../lib/accountManager';
import { TripHistoryReplayModal } from './TripHistoryReplayModal';
import { RadianSymbol } from './RadianSymbol';
import { NativeHaptics, keepScreenAwake } from '../lib/nativeMobileBridge';
import { analyzeRiskLocally } from '../lib/riskAnalyzer';

interface TelematicsHudViewProps {
  currentLanguage: LanguageCode;
  unitSystem: UnitSystem;
  onTripCompleted: (summary: any) => void;
  hasNativeBridge: boolean;
}

export const TelematicsHudView: React.FC<TelematicsHudViewProps> = ({
  unitSystem,
  onTripCompleted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telematicsEngineRef = useRef<any>(null);

  const activeUsername = getActiveUsername();
  const currentAccount = activeUsername ? getAccount(activeUsername) : null;

  const [isTracking, setIsTracking] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [hudData, setHudData] = useState<TelematicsState>({
    speedKmh: 0.0,
    gForceX: 0.0,
    gForceY: 0.0,
    gForceZ: 0.0,
    gForceMag: 0.0,
    jerkMs3: 0.0,
    harshBrakingCount: 0,
    harshCorneringCount: 0,
    distanceKm: 0.0,
    tripStartTime: Date.now(),
    telemetryHistory: []
  });

  // Initialize Canvas Smooth Drive Radar
  useEffect(() => {
    if (canvasRef.current && window.TelematicsEngine) {
      const engine = new window.TelematicsEngine(canvasRef.current);
      telematicsEngineRef.current = engine;

      engine.subscribe((state: TelematicsState) => {
        setHudData({ ...state });

        // Gentle native haptics on physical events
        if (state.harshBrakingCount > 0 && Math.abs(state.jerkMs3) > 3.5) {
          NativeHaptics.heavy();
        } else if (state.gForceMag > 0.55) {
          NativeHaptics.warning();
        }
      });

      return () => {
        engine.stopTracking();
        keepScreenAwake(false);
      };
    }
  }, []);

  const handleStartTracking = (demoMode = false) => {
    if (telematicsEngineRef.current) {
      telematicsEngineRef.current.startTracking(demoMode);
      setIsTracking(true);
      keepScreenAwake(true);
      NativeHaptics.medium();
    }
  };

  const handleStopTracking = () => {
    if (telematicsEngineRef.current) {
      const summary = telematicsEngineRef.current.stopTracking();
      setIsTracking(false);
      keepScreenAwake(false);
      NativeHaptics.success();

      // On-device risk analysis: immediate, logical, and supports both driving and desk testing
      const analysisPayload = {
        ...summary,
        driver_id: activeUsername || 'driver'
      };
      const analysis = analyzeRiskLocally(analysisPayload);

      const currentHour = new Date().getHours();
      const isNight = currentHour >= 20 || currentHour < 6;

      const enrichedSummary = {
        ...summary,
        isNightTrip: isNight,
        trip_summary: analysis.trip_summary,
        classification: analysis.classification,
        key_risk_factors: analysis.key_risk_factors,
        sub_scores: analysis.sub_scores
      };

      recordTripForActiveUser(enrichedSummary, unitSystem);
      onTripCompleted(enrichedSummary);
    }
  };

  const isImperial = unitSystem === 'imperial';
  const displaySpeed = (hudData.speedKmh * (isImperial ? 0.621371 : 1)).toFixed(0);
  const speedUnit = isImperial ? 'MPH' : 'KM/H';
  const displayDistance = (hudData.distanceKm * (isImperial ? 0.621371 : 1)).toFixed(1);
  const distanceUnit = isImperial ? 'mi' : 'km';

  // Stability Status based on live G-force magnitude
  const getStabilityStatus = () => {
    if (!isTracking) {
      return { text: 'Ready to Drive', color: 'text-stone-600', badgeBg: 'bg-stone-50 border-stone-200' };
    }
    if (hudData.gForceMag > 0.55) {
      return { text: 'High Dynamic Motion', color: 'text-rose-600', badgeBg: 'bg-rose-50 border-rose-200' };
    }
    if (hudData.gForceMag > 0.35) {
      return { text: 'Moderate Lateral Force', color: 'text-amber-600', badgeBg: 'bg-amber-50 border-amber-200' };
    }
    return { text: 'Optimal Stability', color: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' };
  };

  const stability = getStabilityStatus();

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Executive Cockpit Header Card */}
      <div className="luxury-card p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <RadianSymbol size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-display tracking-tight">
                  Cockpit Telematics
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                    isTracking
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {isTracking ? 'Recording Live' : 'Ready'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time kinematic vector monitoring & smooth trajectory scoring.
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Trip Log Modal Trigger */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="View Trip Logbook & Route Replay"
            >
              <History className="w-4 h-4 text-stone-600" />
              <span>Logbook</span>
            </button>

            {/* Start / End Driving Session */}
            {!isTracking ? (
              <button
                onClick={() => handleStartTracking(false)}
                className="btn-gold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer uppercase tracking-wider font-extrabold shadow-md"
              >
                <Play className="w-4 h-4 fill-stone-950" />
                <span>Start Drive</span>
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider shadow-md"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>End Drive</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Clean Luxury Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left / Center: Minimalist Radial Radar & Digital Speed Cluster (7 cols) */}
        <div className="lg:col-span-7 luxury-card p-6 flex flex-col items-center justify-between min-h-[380px]">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="card-title mb-0 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#A38258]" /> Kinematic Stability Vector
            </span>
            <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stability.badgeBg} ${stability.color}`}>
              <span>{stability.text}</span>
            </div>
          </div>

          {/* Luxury Instrument Cluster (Speedometer & Vector Canvas) */}
          <div className="relative my-4 flex items-center justify-center">
            {/* Outer Radial Gauge */}
            <div className="hud-luxury-circle relative">
              <canvas ref={canvasRef} width={260} height={260} className="rounded-full absolute inset-0 z-10" />

              {/* Central Clean Numerical Readout */}
              <div className="relative z-20 text-center pointer-events-none mt-2">
                <div className="text-5xl sm:text-6xl font-black tracking-tighter text-stone-900 font-display">
                  {displaySpeed}
                </div>
                <div className="text-xs uppercase font-extrabold tracking-widest text-[#A38258] mt-[-4px]">
                  {speedUnit}
                </div>
              </div>
            </div>
          </div>

          {/* Minimalist G-Force Magnitude Readout */}
          <div className="w-full pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">Instantaneous Force:</span>
              <span className="font-mono font-bold text-stone-900">
                {hudData.gForceMag.toFixed(2)} G
              </span>
            </div>

            <div className="text-right font-mono text-[11px] text-stone-500">
              {isTracking ? 'Active Live Feed' : 'Sensors Calibrated'}
            </div>
          </div>
        </div>

        {/* Right: Clean Live Metrics & Safety Stats (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Live Safety Index Card */}
          <div className="luxury-card p-5 relative overflow-hidden flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="card-title mb-0 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Driver Safety Score
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Overall Index
              </span>
            </div>

            <div className="my-3 flex items-baseline justify-between">
              <div className="text-4xl font-black text-stone-900 font-display tracking-tight">
                {currentAccount?.safetyScore ?? 100}
                <span className="text-base font-normal text-stone-400"> / 100</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 block">
                  {(currentAccount?.safetyScore ?? 100) >= 80 ? 'Safe Driver' : 'Review Needed'}
                </span>
                <span className="text-[10px] text-stone-400">
                  {currentAccount?.totalTrips || 0} total trips
                </span>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C5A880] to-emerald-500 rounded-full transition-all"
                style={{ width: `${currentAccount?.safetyScore ?? 100}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics Split Matrix */}
          <div className="grid grid-cols-2 gap-3">
            {/* Trip Distance */}
            <div className="luxury-panel p-4">
              <span className="card-title block">Session Distance</span>
              <div className="text-2xl font-black text-stone-900 font-display">
                {displayDistance} <span className="text-xs font-semibold text-stone-400">{distanceUnit}</span>
              </div>
              <span className="text-[10px] text-stone-400 block mt-1">Logged to GDL</span>
            </div>

            {/* Harsh Events */}
            <div className="luxury-panel p-4">
              <span className="card-title block">Sudden Events</span>
              <div className="text-2xl font-black text-stone-900 font-display">
                {hudData.harshBrakingCount + hudData.harshCorneringCount}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium block mt-1">
                {hudData.harshBrakingCount + hudData.harshCorneringCount === 0 ? 'Smooth Handling' : 'Spikes Detected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trip History Modal */}
      <TripHistoryReplayModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        unitSystem={unitSystem}
      />
    </div>
  );
};
