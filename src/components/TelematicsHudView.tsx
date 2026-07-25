import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Gauge, Zap, Compass, AlertOctagon, ShieldCheck, Activity, Flame } from 'lucide-react';
import { TelematicsState, LanguageCode } from '../types';

interface TelematicsHudViewProps {
  currentLanguage: LanguageCode;
  onTripCompleted: (summary: any) => void;
  hasNativeBridge: boolean;
}

export const TelematicsHudView: React.FC<TelematicsHudViewProps> = ({
  currentLanguage,
  onTripCompleted,
  hasNativeBridge
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telematicsEngineRef = useRef<any>(null);

  const [isTracking, setIsTracking] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'SMOOTH' | 'CITY_COMMUTE' | 'AGGRESSIVE'>('CITY_COMMUTE');
  const [hudData, setHudData] = useState<TelematicsState>({
    speedKmh: 48.5,
    gForceX: 0.08,
    gForceY: 0.12,
    gForceZ: 0.98,
    gForceMag: 0.14,
    jerkMs3: 0.3,
    harshBrakingCount: 0,
    harshCorneringCount: 0,
    distanceKm: 0.0,
    tripStartTime: Date.now(),
    telemetryHistory: []
  });

  // Initialize Canvas G-Force Engine
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

  const handleStartTracking = () => {
    if (telematicsEngineRef.current) {
      telematicsEngineRef.current.startTracking(selectedScenario);
      setIsTracking(true);
    }
  };

  const handleStopTracking = () => {
    if (telematicsEngineRef.current) {
      const summary = telematicsEngineRef.current.stopTracking();
      setIsTracking(false);
      onTripCompleted(summary);
    }
  };

  const handleHapticTest = () => {
    if (window.AndroidBridge && window.AndroidBridge.triggerHapticWarning) {
      window.AndroidBridge.triggerHapticWarning('HARSH_BRAKING');
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      alert('Emergency Safety Alert Vibration Triggered');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Info */}
      <div className="glass-card p-6 border border-[#2dd4bf]/20 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-[#2dd4bf] animate-pulse" />
              <h2 className="text-xl font-bold text-white font-display">Real-Time Driving Safety Dashboard</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Monitors vehicle speed, smooth acceleration, and braking motion in real time to keep your driving safe and build your youth safety score.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isTracking ? (
              <button
                onClick={handleStartTracking}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-bold hover:shadow-lg hover:shadow-[#2dd4bf]/25 transition-all cursor-pointer glow-mint"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Start Safe Drive</span>
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold hover:shadow-lg hover:shadow-rose-500/25 transition-all cursor-pointer animate-pulse"
              >
                <Square className="w-5 h-5 fill-white" />
                <span>End Drive & Calculate Score</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Telematics Grid: Canvas HUD + Gauge Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Canvas G-Force Vector Radar (6 cols) */}
        <div className="lg:col-span-6 glass-card p-6 flex flex-col items-center justify-center relative">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="card-title flex items-center gap-1.5 mb-0">
              <Compass className="w-4 h-4" /> Driving Motion Radar
            </span>
            <span className="text-xs text-[#2dd4bf] font-mono">
              X: {hudData.gForceX.toFixed(2)}G | Y: {hudData.gForceY.toFixed(2)}G
            </span>
          </div>

          <div className="relative my-2 hud-circle">
            <canvas
              ref={canvasRef}
              width={260}
              height={260}
              className="rounded-full bg-[#020617]/80 border border-white/10 shadow-2xl"
            />
            <div className="absolute inset-0 pointer-events-none rounded-full border border-[#2dd4bf]/20 radar-spinner" />
          </div>

          {/* Radar Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf] shadow-sm shadow-[#2dd4bf]/50" />
              <span>Safe (&lt;0.5G)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a78bfa] shadow-sm shadow-[#a78bfa]/50" />
              <span>Caution (&lt;1.0G)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
              <span>Critical (&gt;1.0G)</span>
            </div>
          </div>
        </div>

        {/* Right Col: Gauges & Metrics (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Velocity & Distance Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="card-title mb-0">Current Speed</span>
                <Gauge className="w-4 h-4 text-[#2dd4bf]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="stat-value font-mono">{hudData.speedKmh.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-semibold uppercase">km/h</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden border border-white/5">
                <div
                  className="bg-[#2dd4bf] h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (hudData.speedKmh / 120) * 100)}%` }}
                />
              </div>
            </div>

            <div className="glass-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="card-title mb-0">Distance</span>
                <Zap className="w-4 h-4 text-[#a78bfa]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="stat-value font-mono text-[#a78bfa]">{hudData.distanceKm.toFixed(2)}</span>
                <span className="text-xs text-slate-400 font-semibold uppercase">km</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Duration: {Math.round((Date.now() - hudData.tripStartTime) / 1000)}s
              </p>
            </div>
          </div>

          {/* G-Force Magnitude & Braking Jerk Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="card-title mb-0">Combined G-Force</span>
                <Activity className="w-4 h-4 text-[#2dd4bf]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`stat-value font-mono ${
                    hudData.gForceMag > 0.5 ? 'text-rose-400' : 'text-[#2dd4bf]'
                  }`}
                >
                  {hudData.gForceMag.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">G</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Threshold: 0.50G Safe Limit
              </p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="card-title mb-0">Braking Jerk</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="stat-value font-mono text-slate-100">{hudData.jerkMs3.toFixed(2)}</span>
                <span className="text-xs text-slate-400">m/s³</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Harsh Brakes: <span className="text-rose-400 font-bold">{hudData.harshBrakingCount}</span>
              </p>
            </div>
          </div>

          {/* Drive Scenario Selection Bar */}
          <div className="glass-card p-4">
            <label className="card-title block mb-2">
              Drive Profile Preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedScenario('SMOOTH')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedScenario === 'SMOOTH'
                    ? 'bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/40 shadow'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                Smooth Cruising
              </button>
              <button
                onClick={() => setSelectedScenario('CITY_COMMUTE')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedScenario === 'CITY_COMMUTE'
                    ? 'bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40 shadow'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                City Commute
              </button>
              <button
                onClick={() => setSelectedScenario('AGGRESSIVE')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedScenario === 'AGGRESSIVE'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                Aggressive Drive
              </button>
            </div>
          </div>

          {/* Test Safety Alert */}
          <button
            onClick={handleHapticTest}
            className="w-full py-2.5 px-4 rounded-xl bg-[#020617]/70 border border-white/10 hover:border-[#a78bfa]/40 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4 text-[#a78bfa]" />
            <span>Test Emergency Safety Alert Vibration</span>
          </button>
        </div>
      </div>

      {/* Time-Series Telemetry Console */}
      <div className="glass-card p-5 font-mono text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <span className="text-slate-300 font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Live Safety Activity Log
          </span>
          <span className="text-slate-400 font-sans text-[11px]">Real-Time Sensors Active</span>
        </div>

        <div className="max-h-32 overflow-y-auto space-y-1 text-slate-400">
          {hudData.telemetryHistory.length === 0 ? (
            <p className="text-slate-400 italic">Click "Start Safe Drive" above to begin tracking your trip safety...</p>
          ) : (
            hudData.telemetryHistory.slice(-5).reverse().map((point, idx) => (
              <div key={idx} className="flex items-center justify-between hover:bg-slate-800/30 px-2 py-0.5 rounded">
                <span className="text-slate-400">{new Date(point.timestamp).toLocaleTimeString()}</span>
                <span>Speed: <strong className="text-emerald-400">{point.velocity} km/h</strong></span>
                <span>G-Force (X, Y): <strong>({point.g_force_x}, {point.g_force_y})</strong></span>
                <span>Jerk: <strong className="text-amber-400">{point.braking_jerk} m/s³</strong></span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
