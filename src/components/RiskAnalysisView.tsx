import React, { useState } from 'react';
import { Cpu, ShieldCheck, Sparkles, RefreshCw, CheckCircle2, Award, ThumbsUp, BarChart2 } from 'lucide-react';
import { RiskAnalysisResult, LanguageCode, UnitSystem } from '../types';
import { t } from '../translations';
import { updateLastTripAnalysis } from '../lib/accountManager';

interface RiskAnalysisViewProps {
  lastTripSummary: any;
  currentLanguage: LanguageCode;
  unitSystem: UnitSystem;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({
  lastTripSummary,
  currentLanguage,
  unitSystem
}) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>({
    status: 'success',
    driver_id: 'anonymous_youth_101',
    trip_summary: {
      data_points: 0,
      avg_velocity_kmh: 0.0,
      max_velocity_kmh: 0.0,
      velocity_std_dev: 0.0,
      max_g_force: 0.0,
      g_force_std_dev: 0.0,
      harsh_braking_count: 0,
      harsh_cornering_count: 0
    },
    classification: {
      risk_score: 0.0,
      safety_score: 100.0,
      risk_category: 'SAFE',
      color_code: '#10b981',
      vector: [0.0, 0.0, 0.0]
    },
    key_risk_factors: [
      'Vehicle is currently stationary.',
      'Baseline motion verified and stable.'
    ]
  });

  const [aiCoachAdvice, setAiCoachAdvice] = useState<string | null>(
    'Safety metrics are ready. Start a driving session on the Drive Dashboard to record and evaluate live driving data.'
  );
  const [aiCoachSource, setAiCoachSource] = useState<string>('Initialization');

  React.useEffect(() => {
    if (lastTripSummary) {
      runAnalysis();
    }
  }, [lastTripSummary]);

  React.useEffect(() => {
    if (analysisResult?.trip_summary) {
      fetchAiCoach(analysisResult.trip_summary);
    }
  }, [currentLanguage]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const payload = lastTripSummary || {
        telemetry: [
          { velocity: 0, g_force_x: 0, g_force_y: 0, g_force_z: 1.0, braking_jerk: 0 }
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
      updateLastTripAnalysis(data);

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
      if (data.source) setAiCoachSource(data.source);
    } catch (err) {
      console.error('AI Coach error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Grade calculator
  const getGrade = (score: number) => {
    if (score >= 95) return { grade: 'A+', label: 'Optimal Performance', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
    if (score >= 85) return { grade: 'A', label: 'Consistent & Stable', badge: 'bg-[#2dd4bf]/10 border-[#2dd4bf]/30 text-[#2dd4bf]' };
    if (score >= 70) return { grade: 'B', label: 'Satisfactory', badge: 'bg-[#a78bfa]/10 border-[#a78bfa]/30 text-[#a78bfa]' };
    return { grade: 'C', label: 'Attention Required', badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400' };
  };

  const gradeInfo = getGrade(analysisResult?.classification.safety_score ?? 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-[#a78bfa]/20 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#a78bfa]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-5 h-5 text-[#a78bfa]" />
              <h2 className="text-xl font-bold text-white font-display">{t('risk_title', currentLanguage)}</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              {t('risk_desc', currentLanguage)}
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#2dd4bf] text-slate-950 font-bold hover:shadow-lg hover:shadow-[#a78bfa]/25 transition-all cursor-pointer disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('recalculate', currentLanguage)}</span>
          </button>
        </div>
      </div>

      {/* Main Analysis Output Grid */}
      {analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Safety Score Card & Grade (5 cols) */}
          <div className="lg:col-span-5 glass-card p-6 space-y-6 flex flex-col justify-between relative overflow-hidden">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Award className="w-5 h-5 text-[#2dd4bf]" />
                <span className="card-title text-xs font-bold text-slate-200 mb-0 uppercase tracking-wider">
                  Overall Safety Score
                </span>
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-center my-4">
                <div className="relative flex flex-col items-center justify-center w-40 h-40 rounded-full bg-[#020617] border-4 border-[#2dd4bf]/40 shadow-2xl glow-mint">
                  <span className="text-4xl font-extrabold text-white font-mono">
                    {Math.round(analysisResult.classification.safety_score)}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#2dd4bf] mt-1">
                    out of 100
                  </span>
                </div>
              </div>

              {/* Grade Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mt-2">
                <span className="font-bold text-[#2dd4bf]">{gradeInfo.grade}</span>
                <span className="text-slate-300">{gradeInfo.label}</span>
              </div>
            </div>

            {/* Stability Factor Breakdown */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <span className="card-title block mb-2 text-xs font-bold text-slate-300 uppercase">
                Stability Factor Breakdown
              </span>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-300">Speed Regularity</span>
                    <span className="font-mono text-[#2dd4bf] font-bold">{Math.max(0, 40 - Math.round(analysisResult.classification.vector[0]))}/40 pts</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="bg-[#2dd4bf] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(10, 100 - (analysisResult.classification.vector[0] / 40) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-300">Turn Stability</span>
                    <span className="font-mono text-[#a78bfa] font-bold">{Math.max(0, 30 - Math.round(analysisResult.classification.vector[1]))}/30 pts</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="bg-[#a78bfa] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(10, 100 - (analysisResult.classification.vector[1] / 30) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-300">Braking Control</span>
                    <span className="font-mono text-emerald-400 font-bold">{Math.max(0, 30 - Math.round(analysisResult.classification.vector[2]))}/30 pts</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(10, 100 - (analysisResult.classification.vector[2] / 30) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Safety Advisor & Trip Highlights (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* AI Advisor Feedback */}
            <div className="glass-card p-6 border border-[#2dd4bf]/30 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2dd4bf]" />
                  <h3 className="card-title text-sm font-bold mb-0 text-white">
                    {t('ai_coach_title', currentLanguage)}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/30">
                  Automated Evaluation
                </span>
              </div>

              {aiLoading ? (
                <div className="py-4 text-xs text-slate-300 italic flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2dd4bf]" />
                  Generating safety recommendations...
                </div>
              ) : (
                <div className="bg-[#020617]/70 p-4 rounded-xl border border-white/10 space-y-2">
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    "{aiCoachAdvice}"
                  </p>
                </div>
              )}
            </div>

            {/* Trip Highlights Cards */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="card-title flex items-center gap-2 mb-3 text-xs font-bold text-white uppercase tracking-wider">
                <ThumbsUp className="w-4 h-4 text-[#a78bfa]" /> {t('trip_metrics', currentLanguage)}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block font-medium">{t('avg_speed', currentLanguage)}</span>
                  <span className="text-base font-bold font-mono text-white">
                    {unitSystem === 'imperial'
                      ? `${(analysisResult.trip_summary.avg_velocity_kmh * 0.621371).toFixed(1)} mph`
                      : `${analysisResult.trip_summary.avg_velocity_kmh} km/h`}
                  </span>
                </div>

                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block font-medium">{t('max_speed', currentLanguage)}</span>
                  <span className="text-base font-bold font-mono text-[#2dd4bf]">
                    {unitSystem === 'imperial'
                      ? `${(analysisResult.trip_summary.max_velocity_kmh * 0.621371).toFixed(1)} mph`
                      : `${analysisResult.trip_summary.max_velocity_kmh} km/h`}
                  </span>
                </div>

                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block font-medium">Ride Stability</span>
                  <span className="text-base font-bold font-mono text-[#a78bfa]">
                    {analysisResult.classification.safety_score >= 85 ? 'Optimal' : 'Standard'}
                  </span>
                </div>

                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block font-medium">Abrupt Stops</span>
                  <span className={`text-base font-bold font-mono ${analysisResult.trip_summary.harsh_braking_count === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {analysisResult.trip_summary.harsh_braking_count}
                  </span>
                </div>

                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block font-medium">Abrupt Turns</span>
                  <span className={`text-base font-bold font-mono ${analysisResult.trip_summary.harsh_cornering_count === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {analysisResult.trip_summary.harsh_cornering_count}
                  </span>
                </div>

                <div className="bg-[#020617]/60 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-slate-400 block font-medium">Points Earned</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    +{Math.round(analysisResult.classification.safety_score * 1.5)} pts
                  </span>
                </div>
              </div>

              {/* Trip Notes */}
              <div className="pt-2">
                <span className="card-title block mb-2 text-xs font-bold text-slate-300 uppercase">
                  {t('risk_factors', currentLanguage)}
                </span>
                <ul className="space-y-2 text-xs text-slate-200">
                  {analysisResult.key_risk_factors.map((factor, idx) => {
                    const formattedFactor = unitSystem === 'imperial'
                      ? factor.replace(/0\.0 km\/h/g, '0.0 mph').replace(/km\/h/g, 'mph')
                      : factor;
                    return (
                      <li key={idx} className="flex items-center gap-2.5 bg-[#020617]/50 p-2.5 rounded-xl border border-white/10">
                        <CheckCircle2 className="w-4 h-4 text-[#2dd4bf] shrink-0" />
                        <span className="font-medium">{formattedFactor}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
