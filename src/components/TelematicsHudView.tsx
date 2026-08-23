import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Square,
  Gauge,
  Zap,
  Compass,
  Volume2,
  VolumeX,
  History,
  Sun,
  Moon,
  CloudSun,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Award
} from 'lucide-react';
import { TelematicsState, LanguageCode, UnitSystem } from '../types';
import { t } from '../translations';
import { recordTripForActiveUser, getActiveUsername, getAccount } from '../lib/accountManager';
import { soundManager } from '../lib/soundAlerts';
import { TripHistoryReplayModal } from './TripHistoryReplayModal';
import { RadianSymbol } from './RadianSymbol';

interface TelematicsHudViewProps {
  currentLanguage: LanguageCode;
  unitSystem: UnitSystem;
  onTripCompleted: (summary: any) => void;
  hasNativeBridge: boolean;
}

export const TelematicsHudView: React.FC<TelematicsHudViewProps> = ({
  currentLanguage,
  unitSystem,
  onTripCompleted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telematicsEngineRef = useRef<any>(null);

  const activeUsername = getActiveUsername();
  const currentAccount = activeUsername ? getAccount(activeUsername) : null;

  const [isTracking, setIsTracking] = useState(false);
  const [voiceAlertsActive, setVoiceAlertsActive] = useState(
    currentAccount?.preferences?.audioVoiceAlerts ?? true
  );
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(
    currentAccount?.preferences?.autoTripDetection ?? true
  );
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Speed Limit State
  const [postedSpeedLimitMph, setPostedSpeedLimitMph] = useState<number>(35);

  // Weather & Time Context State
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 20 || currentHour < 6;
  const isDusk = (currentHour >= 18 && currentHour < 20) || (currentHour >= 6 && currentHour < 7);
  const [weatherCondition, setWeatherCondition] = useState<'Clear' | 'Rain' | 'Fog' | 'Overcast'>('Clear');

  // Auto-start / Auto-stop motion tracking ref
  const highSpeedStreakRef = useRef<number>(0);
  const stoppedStreakRef = useRef<number>(0);

  const [hudData, setHudData] = useState<TelematicsState>({
    speedKmh: 0.0,
    gForceX: 0.0,
    gForceY: 0.0,
    gForceZ: 1.0,
    gForceMag: 0.0,
    jerkMs3: 0.0,
    harshBrakingCount: 0,
    harshCorneringCount: 0,
    distanceKm: 0.0,
    tripStartTime: Date.now(),
    telemetryHistory: []
  });

  // Sound sync
  useEffect(() => {
    soundManager.setPreferences(voiceAlertsActive, true);
  }, [voiceAlertsActive]);

  // Initialize Canvas Smooth Drive Radar
  useEffect(() => {
    if (canvasRef.current && window.TelematicsEngine) {
      const engine = new window.TelematicsEngine(canvasRef.current);
      telematicsEngineRef.current = engine;

      engine.subscribe((state: TelematicsState) => {
        setHudData({ ...state });

        // Real-time voice safety feedback
        if (state.harshBrakingCount > 0 && Math.abs(state.jerkMs3) > 2.8) {
          soundManager.playChime('WARNING');
          soundManager.speak('Sudden braking detected. Maintain a smooth follow distance.');
        } else if (state.gForceMag > 0.65) {
          soundManager.playChime('WARNING');
          soundManager.speak('Moderate turning speed for optimal stability.');
        }

        // Auto-Start & Auto-Stop Motion Evaluation
        if (autoDetectEnabled) {
          const currentSpeedMph = state.speedKmh * 0.621371;

          if (!engine.isTracking && currentSpeedMph > 8) {
            highSpeedStreakRef.current += 1;
            if (highSpeedStreakRef.current >= 3) {
              highSpeedStreakRef.current = 0;
              handleStartTracking(false);
              soundManager.playChime('START');
              soundManager.speak('Driving movement detected. Safety session started.');
            }
          } else {
            highSpeedStreakRef.current = 0;
          }

          if (engine.isTracking && currentSpeedMph < 0.8) {
            stoppedStreakRef.current += 1;
            if (stoppedStreakRef.current >= 25) {
              stoppedStreakRef.current = 0;
              handleStopTracking();
              soundManager.playChime('STOP');
              soundManager.speak('Vehicle parked. Driving session recorded.');
            }
          } else {
            stoppedStreakRef.current = 0;
          }
        }
      });

      return () => {
        engine.stopTracking();
      };
    }
  }, [autoDetectEnabled]);

  const handleStartTracking = (demoMode = false) => {
    if (telematicsEngineRef.current) {
      telematicsEngineRef.current.startTracking(demoMode);
      setIsTracking(true);
      soundManager.playChime('START');
    }
  };

  const handleStopTracking = () => {
    if (telematicsEngineRef.current) {
      const summary = telematicsEngineRef.current.stopTracking();
      setIsTracking(false);

      const enrichedSummary = {
        ...summary,
        weatherCondition,
        isNightTrip: isNight,
        speedLimitMph: postedSpeedLimitMph
      };

      recordTripForActiveUser(enrichedSummary, unitSystem);
      onTripCompleted(enrichedSummary);
      soundManager.playChime('STOP');
    }
  };

  const isImperial = unitSystem === 'imperial';
  const currentSpeedMph = hudData.speedKmh * 0.621371;
  const displaySpeed = (hudData.speedKmh * (isImperial ? 0.621371 : 1)).toFixed(0);
  const speedUnit = isImperial ? 'MPH' : 'KM/H';
  const displayDistance = (hudData.distanceKm * (isImperial ? 0.621371 : 1)).toFixed(1);
  const distanceUnit = isImperial ? 'mi' : 'km';

  // Speed Limit Comparison Logic
  const displayPostedLimit = isImperial ? postedSpeedLimitMph : Math.round(postedSpeedLimitMph * 1.60934);
  const speedDelta = currentSpeedMph - postedSpeedLimitMph;
  const isSpeedExceeded = speedDelta > 5;
  const isNearLimit = speedDelta > 0 && speedDelta <= 5;

  // Stability Status
  const getStabilityStatus = () => {
    if (hudData.gForceMag > 0.6) {
      return { text: 'Sudden Motion', color: 'text-rose-600', badgeBg: 'bg-rose-50 border-rose-200' };
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
                  {isTracking ? 'Live Session' : 'Ready'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time kinematic vector coaching & smooth trajectory scoring.
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Voice Coach Toggle */}
            <button
              onClick={() => setVoiceAlertsActive(!voiceAlertsActive)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                voiceAlertsActive
                  ? 'bg-[#C5A880]/15 border-[#C5A880] text-[#A38258]'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}
              title={voiceAlertsActive ? 'Spoken Voice Safety Alerts Active' : 'Voice Alerts Muted'}
            >
              {voiceAlertsActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden md:inline">{voiceAlertsActive ? 'Voice Coach' : 'Muted'}</span>
            </button>

            {/* Trip Log Modal Trigger */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="View Trip Logbook & Route Replay"
            >
              <History className="w-4 h-4 text-stone-600" />
              <span className="hidden md:inline">Logbook</span>
            </button>

            {/* Start / End Driving Session */}
            {!isTracking ? (
              <button
                onClick={() => handleStartTracking(false)}
                className="btn-gold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-stone-950" />
                <span>Start Session</span>
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider shadow-md"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>End Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Quick Settings Drawer */}
        <div className="mt-4 pt-3 border-t border-stone-200/60">
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className="w-full flex items-center justify-between text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer py-1"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#A38258]" />
              <span>Drive Context: {weatherCondition} • {isNight ? 'Night' : 'Daylight'} • Road Limit: {displayPostedLimit} {speedUnit}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-400">
              <span>{showPreferences ? 'Hide Options' : 'Adjust'}</span>
              {showPreferences ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showPreferences && (
            <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in">
              {/* Road Speed Limit */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Road Speed Limit</label>
                <select
                  value={postedSpeedLimitMph}
                  onChange={(e) => setPostedSpeedLimitMph(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#C5A880]"
                >
                  <option value={25}>25 MPH (City / Residential)</option>
                  <option value={35}>35 MPH (Arterial / Suburb)</option>
                  <option value={45}>45 MPH (Avenue / Express)</option>
                  <option value={65}>65 MPH (Highway / Interstate)</option>
                </select>
              </div>

              {/* Weather Condition */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Road Condition</label>
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200">
                  {(['Clear', 'Rain', 'Fog'] as const).map((cond) => (
                    <button
                      key={cond}
                      onClick={() => setWeatherCondition(cond)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        weatherCondition === cond
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Detection Toggle */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-500 uppercase">Trip Auto-Start</label>
                <button
                  onClick={() => setAutoDetectEnabled(!autoDetectEnabled)}
                  className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    autoDetectEnabled
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-stone-50 border-stone-200 text-stone-500'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Auto-Detect Movement</span>
                  </span>
                  <span className="font-mono text-[10px]">{autoDetectEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          )}
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

          {/* Minimalist Speed Limit Indicator */}
          <div className="w-full pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">Speed Advisory:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                  isSpeedExceeded
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isNearLimit
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isSpeedExceeded
                  ? 'Exceeding Posted Limit'
                  : isNearLimit
                  ? 'At Road Limit'
                  : 'Safe Driving Pace'}
              </span>
            </div>

            <div className="text-right font-mono font-bold text-stone-900">
              Limit: {displayPostedLimit} {speedUnit}
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
                Live Rating
              </span>
            </div>

            <div className="my-3 flex items-baseline justify-between">
              <div className="text-4xl font-black text-stone-900 font-display tracking-tight">
                {currentAccount?.safetyScore || 98}
                <span className="text-base font-normal text-stone-400"> / 100</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 block">Clean Record</span>
                <span className="text-[10px] text-stone-400">Zero sudden incidents</span>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C5A880] to-emerald-500 rounded-full"
                style={{ width: `${currentAccount?.safetyScore || 98}%` }}
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
              <span className="text-[10px] text-emerald-600 font-medium block mt-1">Defensive Pace</span>
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
