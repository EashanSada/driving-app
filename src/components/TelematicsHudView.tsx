import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Gauge, Zap, Compass, AlertOctagon, ShieldCheck, Activity, CheckCircle2, Car, Clock } from 'lucide-react';
import { TelematicsState, LanguageCode, UnitSystem } from '../types';
import { t } from '../translations';
import { recordTripForActiveUser } from '../lib/accountManager';

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

  const [isTracking, setIsTracking] = useState(false);
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

  // Initialize Canvas Smooth Drive Radar
  useEffect(() => {
    if (canvasRef.current && window.TelematicsEngine) {
      const engine = new window.TelematicsEngine(canvasRef.current);
      telematicsEngineRef.current = engine;

      engine.subscribe((state: TelematicsState) => {
        setHudData({ ...state });
      });

      return () => {
        engine.stopTracking();
      };
    }
  }, []);

  const handleStartTracking = (demoMode = false) => {
    if (telematicsEngineRef.current) {
      telematicsEngineRef.current.startTracking(demoMode);
      setIsTracking(true);
    }
  };

  const handleStopTracking = () => {
    if (telematicsEngineRef.current) {
      const summary = telematicsEngineRef.current.stopTracking();
      setIsTracking(false);
      recordTripForActiveUser(summary, unitSystem);
      onTripCompleted(summary);
    }
  };

  const handleHapticTest = () => {
    if (window.AndroidBridge && window.AndroidBridge.triggerHapticWarning) {
      window.AndroidBridge.triggerHapticWarning('HARSH_BRAKING');
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([150, 80, 150]);
      }
    }
  };

  const isImperial = unitSystem === 'imperial';
  const displaySpeed = (hudData.speedKmh * (isImperial ? 0.621371 : 1)).toFixed(1);
  const speedUnit = isImperial ? 'mph' : 'km/h';
  const displayDistance = (hudData.distanceKm * (isImperial ? 0.621371 : 1)).toFixed(2);
  const distanceUnit = isImperial ? 'mi' : 'km';
  const speedBarPercent = Math.min(100, ((hudData.speedKmh * (isImperial ? 0.621371 : 1)) / (isImperial ? 75 : 120)) * 100);

  // Professional ride stability status
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
      {/* Top Banner Info */}
      <div className="glass-card p-6 border border-[#2dd4bf]/20 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-[#2dd4bf]" />
              <h2 className="text-xl font-bold text-white font-display">{t('hud_title', currentLanguage)}</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              {t('hud_desc', currentLanguage)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isTracking ? (
              <button
                onClick={() => handleStartTracking(false)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-bold hover:shadow-lg hover:shadow-[#2dd4bf]/25 transition-all cursor-pointer glow-mint text-sm"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{t('start_drive', currentLanguage)}</span>
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold hover:shadow-lg hover:shadow-rose-500/25 transition-all cursor-pointer text-sm"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>{t('stop_drive', currentLanguage)}</span>
              </button>
            )}
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
            <canvas
              ref={canvasRef}
              width={260}
              height={260}
              className="rounded-full shadow-2xl"
            />
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

        {/* Right Col: Clean Telematics Metrics (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Speed & Distance Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="card-title mb-0 text-xs text-slate-400 font-bold uppercase">{t('current_speed', currentLanguage)}</span>
                <Gauge className="w-4 h-4 text-[#2dd4bf]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">{displaySpeed}</span>
                <span className="text-xs text-[#2dd4bf] font-bold uppercase">{speedUnit}</span>
              </div>
              <div className="w-full bg-slate-900/90 h-1.5 rounded-full mt-3 overflow-hidden border border-white/10">
                <div
                  className="bg-[#2dd4bf] h-full transition-all duration-300"
                  style={{ width: `${speedBarPercent}%` }}
                />
              </div>
            </div>

            <div className="glass-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="card-title mb-0 text-xs text-slate-400 font-bold uppercase">{t('trip_distance', currentLanguage)}</span>
                <Zap className="w-4 h-4 text-[#a78bfa]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#a78bfa] font-mono">{displayDistance}</span>
                <span className="text-xs text-slate-400 font-bold uppercase">{distanceUnit}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{isTracking ? `Duration: ${Math.round((Date.now() - hudData.tripStartTime) / 1000)}s` : 'Ready to record'}</span>
              </p>
            </div>
          </div>

          {/* Smoothness & Braking Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="card-title mb-0 text-xs text-slate-400 font-bold uppercase">{t('motion_gforce', currentLanguage)}</span>
                <Activity className="w-4 h-4 text-[#2dd4bf]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-bold font-mono ${hudData.gForceMag > 0.5 ? 'text-rose-400' : 'text-[#2dd4bf]'}`}>
                  {hudData.gForceMag < 0.35 ? 'Optimal' : (hudData.gForceMag < 0.6 ? 'Moderate' : 'Elevated')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Target: Maintain optimal zone
              </p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="card-title mb-0 text-xs text-slate-400 font-bold uppercase">{t('harsh_braking', currentLanguage)}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-bold font-mono ${hudData.harshBrakingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {hudData.harshBrakingCount === 0 ? 'Smooth' : `${hudData.harshBrakingCount} Abrupt`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Zero sudden stops recorded
              </p>
            </div>
          </div>

          {/* Device Sensor Mode */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="card-title mb-0 flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Car className="w-4 h-4 text-[#2dd4bf]" /> {t('sensor_mode', currentLanguage)}
              </span>
              <span className="text-[11px] font-semibold text-[#2dd4bf] bg-[#2dd4bf]/10 px-2.5 py-0.5 rounded-full border border-[#2dd4bf]/30">
                {t('real_sensors', currentLanguage)}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t('sensor_note', currentLanguage).replace('0.0 km/h', `0.0 ${speedUnit}`)}
            </p>

            {/* Desktop Simulation Test */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>{t('desktop_test', currentLanguage)}</span>
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
          </div>

          {/* Test Safety Alert */}
          <button
            onClick={handleHapticTest}
            className="w-full py-2.5 px-4 rounded-xl bg-[#020617]/70 border border-white/10 hover:border-[#a78bfa]/40 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4 text-[#a78bfa]" />
            <span>{t('test_haptic', currentLanguage)}</span>
          </button>
        </div>
      </div>

      {/* Live Drive Highlights Activity Log */}
      <div className="glass-card p-5 text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <span className="text-slate-200 font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2dd4bf]" /> Live Drive Feed
          </span>
          <span className="text-[#2dd4bf] font-medium text-[11px] bg-[#2dd4bf]/10 px-2 py-0.5 rounded-md border border-[#2dd4bf]/20">
            {t('gps_active', currentLanguage)}
          </span>
        </div>

        <div className="max-h-32 overflow-y-auto space-y-1.5 text-slate-300">
          {hudData.telemetryHistory.length === 0 ? (
            <p className="text-slate-400 italic py-2">Click "{t('start_drive', currentLanguage)}" above to begin recording driving data...</p>
          ) : (
            hudData.telemetryHistory.slice(-5).reverse().map((point, idx) => (
              <div key={idx} className="flex items-center justify-between hover:bg-slate-800/40 px-3 py-1.5 rounded-lg border border-white/5 transition-colors">
                <span className="text-slate-400 font-mono">{new Date(point.timestamp).toLocaleTimeString()}</span>
                <span className="text-slate-200">Speed: <strong className="text-[#2dd4bf]">{(point.velocity * (isImperial ? 0.621371 : 1)).toFixed(1)} {speedUnit}</strong></span>
                <span className="text-slate-300">Ride Stability: <strong className="text-emerald-400">{point.braking_jerk < 1.0 ? 'Optimal' : 'Standard'}</strong></span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
