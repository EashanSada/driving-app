import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Square,
  Gauge,
  Zap,
  Compass,
  AlertOctagon,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Car,
  Clock,
  Volume2,
  VolumeX,
  History,
  Sun,
  Moon,
  CloudSun,
  CloudRain,
  CloudFog,
  Radio,
  Sliders
} from 'lucide-react';
import { TelematicsState, LanguageCode, UnitSystem } from '../types';
import { t } from '../translations';
import { recordTripForActiveUser, getActiveUsername, getAccount } from '../lib/accountManager';
import { soundManager } from '../lib/soundAlerts';
import { TripHistoryReplayModal } from './TripHistoryReplayModal';

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
  hasNativeBridge
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
          soundManager.speak('Moderate your turning speed to maintain vehicle stability.');
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
            // 25 updates stationary = ~25s auto-stop
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

  const handleHapticTest = () => {
    soundManager.playChime('WARNING');
    soundManager.speak('Test safety alert activated.');
    if (window.AndroidBridge && window.AndroidBridge.triggerHapticWarning) {
      window.AndroidBridge.triggerHapticWarning('HARSH_BRAKING');
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([150, 80, 150]);
      }
    }
  };

  const isImperial = unitSystem === 'imperial';
  const currentSpeedMph = hudData.speedKmh * 0.621371;
  const displaySpeed = (hudData.speedKmh * (isImperial ? 0.621371 : 1)).toFixed(1);
  const speedUnit = isImperial ? 'mph' : 'km/h';
  const displayDistance = (hudData.distanceKm * (isImperial ? 0.621371 : 1)).toFixed(2);
  const distanceUnit = isImperial ? 'mi' : 'km';
  const speedBarPercent = Math.min(
    100,
    ((hudData.speedKmh * (isImperial ? 0.621371 : 1)) / (isImperial ? 75 : 120)) * 100
  );

  // Speed Limit Comparison Logic
  const displayPostedLimit = isImperial ? postedSpeedLimitMph : Math.round(postedSpeedLimitMph * 1.60934);
  const speedDelta = currentSpeedMph - postedSpeedLimitMph;
  const isSpeedExceeded = speedDelta > 5;
  const isNearLimit = speedDelta > 0 && speedDelta <= 5;

  // Stability Status
  const getStabilityStatus = () => {
    if (hudData.gForceMag > 0.6) {
      return { text: 'Sudden Movement', color: 'text-rose-400', badgeBg: 'bg-rose-500/10 border-rose-500/30' };
    }
    if (hudData.gForceMag > 0.35) {
      return { text: 'Moderate Lateral Force', color: 'text-[#a78bfa]', badgeBg: 'bg-[#a78bfa]/10 border-[#a78bfa]/30' };
    }
    return { text: 'Optimal Stability', color: 'text-[#2dd4bf]', badgeBg: 'bg-[#2dd4bf]/10 border-[#2dd4bf]/30' };
  };

  const stability = getStabilityStatus();

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="glass-card p-6 border border-[#2dd4bf]/20 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-[#2dd4bf]" />
              <h2 className="text-xl font-bold text-white font-display">{t('hud_title', currentLanguage)}</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">{t('hud_desc', currentLanguage)}</p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Audio Voice Alert Toggle */}
            <button
              onClick={() => setVoiceAlertsActive(!voiceAlertsActive)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                voiceAlertsActive
                  ? 'bg-[#2dd4bf]/15 border-[#2dd4bf] text-[#2dd4bf]'
                  : 'bg-[#020617] border-white/10 text-slate-400'
              }`}
              title={voiceAlertsActive ? 'Spoken Voice Safety Alerts Enabled' : 'Voice Alerts Muted'}
            >
              {voiceAlertsActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{voiceAlertsActive ? 'Voice On' : 'Muted'}</span>
            </button>

            {/* Trip History Button */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-2.5 rounded-xl bg-[#020617] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Inspect Trip History and Route Replay"
            >
              <History className="w-4 h-4 text-[#a78bfa]" />
              <span className="hidden sm:inline">Trips Log</span>
            </button>

            {/* Start / Stop Driving Session Button */}
            {!isTracking ? (
              <button
                onClick={() => handleStartTracking(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-bold hover:shadow-lg hover:shadow-[#2dd4bf]/25 transition-all cursor-pointer glow-mint text-xs uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{t('start_drive', currentLanguage)}</span>
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold hover:shadow-lg hover:shadow-rose-500/25 transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>{t('stop_drive', currentLanguage)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Environmental & Speed Limit Context Bar */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Day / Night / Weather Context */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#020617] border border-white/10 text-slate-300 font-medium">
              {isNight ? (
                <Moon className="w-3.5 h-3.5 text-[#a78bfa]" />
              ) : isDusk ? (
                <CloudSun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{isNight ? 'Night Driving' : isDusk ? 'Dusk / Low Light' : 'Daylight Driving'}</span>
            </div>

            {/* Weather Selector */}
            <div className="flex items-center gap-1 bg-[#020617] p-0.5 rounded-lg border border-white/10">
              {(['Clear', 'Rain', 'Fog'] as const).map((cond) => (
                <button
                  key={cond}
                  onClick={() => setWeatherCondition(cond)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    weatherCondition === cond
                      ? 'bg-[#2dd4bf] text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Start Badge & Posted Speed Selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoDetectEnabled(!autoDetectEnabled)}
              className={`text-[11px] font-mono flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                autoDetectEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-white/10 text-slate-500'
              }`}
              title="Motion sensor auto-detection for starting/stopping driving sessions"
            >
              <Radio className="w-3 h-3" />
              <span>Auto-Detect: {autoDetectEnabled ? 'Active' : 'Manual'}</span>
            </button>

            {/* Posted Road Speed Selector */}
            <div className="flex items-center gap-1.5 bg-[#020617] px-2 py-1 rounded-lg border border-white/10">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Road Limit:</span>
              <select
                value={postedSpeedLimitMph}
                onChange={(e) => setPostedSpeedLimitMph(Number(e.target.value))}
                className="bg-transparent text-xs font-bold font-mono text-[#2dd4bf] focus:outline-none cursor-pointer"
              >
                <option value={25} className="bg-slate-900 text-white">25 mph (City)</option>
                <option value={35} className="bg-slate-900 text-white">35 mph (Arterial)</option>
                <option value={45} className="bg-slate-900 text-white">45 mph (Avenue)</option>
                <option value={65} className="bg-slate-900 text-white">65 mph (Highway)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Telematics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Smooth Drive Radar (6 cols) */}
        <div className="lg:col-span-6 glass-card p-6 flex flex-col items-center justify-center relative">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="card-title flex items-center gap-2 mb-0 text-xs font-bold text-white uppercase tracking-wider">
              <Compass className="w-4 h-4 text-[#2dd4bf]" /> {t('g_force_vector', currentLanguage)}
            </span>
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${stability.badgeBg} ${stability.color}`}>
              <span>{stability.text}</span>
            </div>
          </div>

          <div className="relative my-2 hud-circle">
            <canvas ref={canvasRef} width={260} height={260} className="rounded-full shadow-2xl" />
          </div>

          {/* Clean Radar Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf]" />
              <span>Optimal Zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a78bfa]" />
              <span>Standard Turn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Sudden Force</span>
            </div>
          </div>
        </div>

        {/* Right Col: Clean Telematics Metrics & Speed Limit Comparison (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Speed & Posted Limit Card */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#2dd4bf]" />
                <span className="card-title mb-0 text-xs text-slate-300 font-bold uppercase">
                  {t('current_speed', currentLanguage)}
                </span>
              </div>

              {/* Dynamic Speed Limit Comparison Badge */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                  isSpeedExceeded
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isNearLimit
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isSpeedExceeded
                  ? 'Exceeding Limit'
                  : isNearLimit
                  ? 'At Road Limit'
                  : 'Within Posted Limit'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">{displaySpeed}</span>
                <span className="text-xs text-[#2dd4bf] font-bold uppercase">{speedUnit}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Posted Limit</span>
                <span className="text-sm font-bold font-mono text-[#2dd4bf]">
                  {displayPostedLimit} {speedUnit}
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-900/90 h-1.5 rounded-full mt-3 overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-300 ${
                  isSpeedExceeded ? 'bg-rose-500' : 'bg-[#2dd4bf]'
                }`}
                style={{ width: `${speedBarPercent}%` }}
              />
            </div>
          </div>

          {/* Distance & Duration Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="card-title mb-0 text-[11px] text-slate-400 font-bold uppercase">
                  {t('trip_distance', currentLanguage)}
                </span>
                <Zap className="w-3.5 h-3.5 text-[#a78bfa]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#a78bfa] font-mono">{displayDistance}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{distanceUnit}</span>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="card-title mb-0 text-[11px] text-slate-400 font-bold uppercase">
                  {t('harsh_braking', currentLanguage)}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-black font-mono ${
                    hudData.harshBrakingCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {hudData.harshBrakingCount}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">abrupt stops</span>
              </div>
            </div>
          </div>

          {/* Desktop Simulation Controls */}
          <div className="glass-card p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#2dd4bf]" /> Desktop Sensor Simulator
              </span>
              <button
                onClick={() => {
                  if (telematicsEngineRef.current) {
                    if (!isTracking) handleStartTracking(true);
                    telematicsEngineRef.current.setDemoSpeed(isImperial ? 48.28 : 45);
                  }
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#2dd4bf] text-xs font-semibold border border-white/10 cursor-pointer transition-colors"
              >
                {isImperial ? 'Simulate 30 mph Motion' : t('sim_speed', currentLanguage)}
              </button>
            </div>

            <button
              onClick={handleHapticTest}
              className="w-full py-2 px-3 rounded-lg bg-[#020617]/70 border border-white/10 hover:border-[#a78bfa]/40 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-[#a78bfa]" />
              <span>Test Audio & Haptic Alert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Telemetry Activity Feed */}
      <div className="glass-card p-5 text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <span className="text-slate-200 font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2dd4bf]" /> Live Telemetry Feed
          </span>
          <span className="text-[#2dd4bf] font-medium text-[11px] bg-[#2dd4bf]/10 px-2 py-0.5 rounded-md border border-[#2dd4bf]/20">
            {t('gps_active', currentLanguage)}
          </span>
        </div>

        <div className="max-h-28 overflow-y-auto space-y-1.5 text-slate-300">
          {hudData.telemetryHistory.length === 0 ? (
            <p className="text-slate-400 italic py-2">
              Click "{t('start_drive', currentLanguage)}" above or start driving to begin recording live telemetry...
            </p>
          ) : (
            hudData.telemetryHistory
              .slice(-4)
              .reverse()
              .map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between hover:bg-slate-800/40 px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
                >
                  <span className="text-slate-400 font-mono">
                    {new Date(point.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-slate-200">
                    Speed:{' '}
                    <strong className="text-[#2dd4bf]">
                      {(point.velocity * (isImperial ? 0.621371 : 1)).toFixed(1)} {speedUnit}
                    </strong>
                  </span>
                  <span className="text-slate-300">
                    Ride Stability:{' '}
                    <strong className="text-emerald-400">
                      {point.braking_jerk < 1.0 ? 'Optimal' : 'Standard'}
                    </strong>
                  </span>
                </div>
              ))
          )}
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
