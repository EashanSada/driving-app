import React, { useState } from 'react';
import { Cpu, ShieldCheck, AlertTriangle, Sparkles, RefreshCw, Layers, CheckCircle2, FileJson } from 'lucide-react';
import { RiskAnalysisResult, LanguageCode } from '../types';

interface RiskAnalysisViewProps {
  lastTripSummary: any;
  currentLanguage: LanguageCode;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({
  lastTripSummary,
  currentLanguage
}) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>({
    status: 'success',
    driver_id: 'anonymous_youth_101',
    trip_summary: {
      data_points: 120,
      avg_velocity_kmh: 48.5,
      max_velocity_kmh: 72.0,
      velocity_std_dev: 6.4,
      max_g_force: 0.38,
      g_force_std_dev: 0.045,
      harsh_braking_count: 0,
      harsh_cornering_count: 0
    },
    classification: {
      risk_score: 18.5,
      safety_score: 81.5,
      risk_category: 'SAFE',
      color_code: '#10b981',
      vector: [8.2, 5.3, 5.0]
    },
    key_risk_factors: [
      'Smooth, steady speed control maintained across the trip.',
      'G-Force vector stayed within the 0.5G safety boundary.'
    ]
  });

  const [aiCoachAdvice, setAiCoachAdvice] = useState<string | null>(
    'Great job keeping your vehicle under control! Maintain a 3-second follow distance to anticipate traffic stops smoothly.'
  );

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const payload = lastTripSummary || {
        telemetry: [
          { velocity: 45, g_force_x: 0.1, g_force_y: 0.1, g_force_z: 0.98, braking_jerk: 0.2 },
          { velocity: 52, g_force_x: 0.12, g_force_y: -0.2, g_force_z: 1.0, braking_jerk: 0.5 },
          { velocity: 48, g_force_x: 0.08, g_force_y: 0.1, g_force_z: 0.99, braking_jerk: 0.3 }
        ],
        harshBrakingCount: 0,
        harshCorneringCount: 0
      };

      const res = await fetch('/api/analyze-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setAnalysisResult(data);

      // Trigger AI Safety Coach
      fetchAiCoach(data.trip_summary);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiCoach = async (summaryData: any) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripSummary: summaryData,
          language: currentLanguage
        })
      });
      const data = await res.json();
      setAiCoachAdvice(data.advice);
    } catch (err) {
      console.error('AI Coach error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-[#a78bfa]/20 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#a78bfa]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-[#a78bfa]" />
              <h2 className="text-xl font-bold text-white font-display">AI Safety Score & Driving Analysis</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Analyzes speed smoothness, acceleration stability, and braking habits to calculate your safety index and provide personalized driving tips.
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#2dd4bf] text-slate-950 font-bold hover:shadow-lg hover:shadow-[#a78bfa]/25 transition-all cursor-pointer disabled:opacity-50 glow-violet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Analyze Recent Drive</span>
          </button>
        </div>
      </div>

      {/* Main Analysis Output Grid */}
      {analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Risk Score Gauge & Vector (5 cols) */}
          <div className="lg:col-span-5 glass-card p-6 space-y-6 flex flex-col justify-between">
            <div>
              <span className="card-title block mb-4">
                Overall Safety Classification
              </span>

              <div className="flex items-center justify-center my-4">
                <div className="relative flex items-center justify-center w-40 h-40 rounded-full bg-[#020617] border-4 border-[#2dd4bf]/30 shadow-2xl glow-mint">
                  <div className="text-center">
                    <span className="stat-value text-4xl block text-[#2dd4bf]">
                      {analysisResult.classification.safety_score}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#a78bfa] mt-1 block">
                      Safety Index
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border"
                  style={{
                    color: analysisResult.classification.color_code === '#10b981' ? '#2dd4bf' : analysisResult.classification.color_code,
                    backgroundColor: `${analysisResult.classification.color_code}15`,
                    borderColor: `${analysisResult.classification.color_code}40`
                  }}
                >
                  {analysisResult.classification.risk_category} RISK CATEGORY
                </span>
              </div>
            </div>

            {/* Risk Vector Breakdown */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <span className="card-title block mb-2">
                Safety Factor Breakdown
              </span>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Speed Smoothness</span>
                    <span className="font-mono text-[#2dd4bf]">{analysisResult.classification.vector[0]}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="bg-[#2dd4bf] h-full"
                      style={{ width: `${(analysisResult.classification.vector[0] / 40) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Acceleration & Cornering Stability</span>
                    <span className="font-mono text-[#a78bfa]">{analysisResult.classification.vector[1]}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="bg-[#a78bfa] h-full"
                      style={{ width: `${(analysisResult.classification.vector[1] / 30) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Braking Smoothness</span>
                    <span className="font-mono text-amber-400">{analysisResult.classification.vector[2]}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${(analysisResult.classification.vector[2] / 30) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Statistics & AI Coach (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Gemini AI Driving Coach Feedback */}
            <div className="glass-card p-6 border border-[#2dd4bf]/30 relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#2dd4bf] animate-spin" style={{ animationDuration: '6s' }} />
                <h3 className="card-title text-base mb-0 text-[#2dd4bf]">
                  Gemini AI Safety Coach ({currentLanguage.toUpperCase()})
                </h3>
              </div>

              {aiLoading ? (
                <div className="py-4 text-xs text-slate-400 italic flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2dd4bf]" />
                  Generating personalized coaching tips in {currentLanguage.toUpperCase()}...
                </div>
              ) : (
                <p className="text-sm text-slate-200 leading-relaxed font-sans bg-[#020617]/70 p-4 rounded-xl border border-white/10">
                  "{aiCoachAdvice}"
                </p>
              )}
            </div>

            {/* Detailed Driving Statistics */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="card-title flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-[#a78bfa]" /> Driving Metrics
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block">Avg Speed</span>
                  <span className="text-base font-bold font-mono text-white">
                    {analysisResult.trip_summary.avg_velocity_kmh} km/h
                  </span>
                </div>
                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block">Speed Consistency</span>
                  <span className="text-base font-bold font-mono text-[#2dd4bf]">
                    ±{analysisResult.trip_summary.velocity_std_dev}
                  </span>
                </div>
                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block">Motion Balance</span>
                  <span className="text-base font-bold font-mono text-[#a78bfa]">
                    ±{analysisResult.trip_summary.g_force_std_dev}
                  </span>
                </div>
                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block">Harsh Brakes</span>
                  <span className="text-base font-bold font-mono text-amber-400">
                    {analysisResult.trip_summary.harsh_braking_count}
                  </span>
                </div>
                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block">Harsh Turns</span>
                  <span className="text-base font-bold font-mono text-rose-400">
                    {analysisResult.trip_summary.harsh_cornering_count}
                  </span>
                </div>
                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block">Driving Samples</span>
                  <span className="text-base font-bold font-mono text-slate-300">
                    {analysisResult.trip_summary.data_points}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="card-title block mb-2">
                  Identified Key Risk Factors
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {analysisResult.key_risk_factors.map((factor, idx) => (
                    <li key={idx} className="flex items-center gap-2 bg-[#020617]/40 p-2.5 rounded-lg border border-white/10">
                      <CheckCircle2 className="w-4 h-4 text-[#2dd4bf] shrink-0" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
