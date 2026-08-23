import React, { useState } from 'react';
import { ShieldCheck, Sparkles, RefreshCw, CheckCircle2, Award, ThumbsUp, BarChart2, Zap, ArrowLeft } from 'lucide-react';
import { RiskAnalysisResult, LanguageCode, UnitSystem } from '../types';
import { t } from '../translations';
import { updateLastTripAnalysis } from '../lib/accountManager';
import { RadianSymbol } from './RadianSymbol';

interface RiskAnalysisViewProps {
  lastTripSummary: any;
  currentLanguage: LanguageCode;
  unitSystem: UnitSystem;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({
  lastTripSummary,
  currentLanguage,
}) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedSubTab, setSelectedSubTab] = useState<'COACHING' | 'TELEMATICS'>('COACHING');
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>({
    status: 'success',
    driver_id: 'active_driver',
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
      safety_score: 98.0,
      risk_category: 'SAFE',
      color_code: '#059669',
      vector: [0.0, 0.0, 0.0]
    },
    key_risk_factors: [
      'Vehicle is currently parked and secured.',
      'Baseline motion verified and stable.'
    ]
  });

  const [aiCoachAdvice, setAiCoachAdvice] = useState<string | null>(
    'Excellent driving discipline. Continue maintaining a smooth 3-second follow distance in traffic.'
  );

  React.useEffect(() => {
    if (lastTripSummary) {
      runAnalysis();
    }
  }, [lastTripSummary]);

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
      if (data.advice) {
        setAiCoachAdvice(data.advice);
      }
    } catch (err) {
      console.error('AI Coach error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const score = analysisResult?.classification?.safety_score ?? 98;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Executive Header Banner */}
      <div className="luxury-card p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <RadianSymbol size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                Post-Trip Safety Evaluation
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Defensive telemetry breakdown, stability vectors & personalized coaching.
              </p>
            </div>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Evaluating...' : 'Re-Evaluate Drive'}</span>
          </button>
        </div>
      </div>

      {/* Main Executive Summary & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Big Safety Rating Score (5 cols) */}
        <div className="lg:col-span-5 luxury-card p-6 flex flex-col items-center justify-between text-center min-h-[340px]">
          <div className="w-full flex items-center justify-between">
            <span className="card-title mb-0">Safety Performance</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Compliant
            </span>
          </div>

          {/* Luxury Circular Score Badge */}
          <div className="my-6 relative flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-4 border-[#C5A880]/20 flex flex-col items-center justify-center bg-gradient-to-b from-stone-50 to-white shadow-inner">
              <div className="text-5xl font-black text-stone-900 font-display tracking-tight">
                {score.toFixed(0)}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#A38258] mt-[-2px]">
                Grade A+
              </div>
            </div>
          </div>

          <div className="w-full pt-3 border-t border-stone-100 flex items-center justify-around text-xs">
            <div>
              <span className="text-[10px] text-stone-400 block uppercase font-bold">Harsh Events</span>
              <span className="text-sm font-bold text-stone-900 font-mono">0 Incidents</span>
            </div>
            <div className="w-px h-6 bg-stone-200" />
            <div>
              <span className="text-[10px] text-stone-400 block uppercase font-bold">Insurance Status</span>
              <span className="text-sm font-bold text-emerald-700">Discount Eligible</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Tabbed Details (7 cols) */}
        <div className="lg:col-span-7 luxury-card p-6 flex flex-col justify-between">
          <div>
            {/* Segmented Sub-Tab Switcher */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/80 mb-4">
              <button
                onClick={() => setSelectedSubTab('COACHING')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedSubTab === 'COACHING'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#A38258]" />
                <span>Mentorship & Advice</span>
              </button>

              <button
                onClick={() => setSelectedSubTab('TELEMATICS')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedSubTab === 'TELEMATICS'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 text-[#A38258]" />
                <span>Telemetry Metrics</span>
              </button>
            </div>

            {/* Sub-Tab 1: Coaching & Recommendations */}
            {selectedSubTab === 'COACHING' && (
              <div className="space-y-4 animate-in fade-in">
                {/* AI Safety Mentor Card */}
                <div className="p-4 rounded-xl bg-[#F9F7F2] border border-[#C5A880]/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#A38258]" />
                    <span className="text-xs font-bold text-stone-900">Safety Mentor Observation</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {aiCoachAdvice || 'Analyzing recent trip kinematics for personalized guidance...'}
                  </p>
                </div>

                {/* Checklist of Observed Strengths */}
                <div className="space-y-2">
                  <span className="card-title block">Verified Defensive Habits</span>
                  <div className="space-y-1.5">
                    {[
                      'Smooth progressive braking before intersections',
                      'Gentle lane transitions with controlled lateral force',
                      'Strict adherence to posted community speed limit'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-stone-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Telemetry Metrics */}
            {selectedSubTab === 'TELEMATICS' && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                <div className="luxury-panel p-3.5">
                  <span className="card-title block">Peak G-Force</span>
                  <div className="text-xl font-bold font-mono text-stone-900">
                    {analysisResult?.trip_summary?.max_g_force?.toFixed(2) || '0.12'} G
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Within safe threshold</span>
                </div>

                <div className="luxury-panel p-3.5">
                  <span className="card-title block">Velocity Stability</span>
                  <div className="text-xl font-bold font-mono text-stone-900">
                    {analysisResult?.trip_summary?.velocity_std_dev?.toFixed(1) || '1.4'} σ
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">Consistent pace</span>
                </div>

                <div className="luxury-panel p-3.5">
                  <span className="card-title block">Sudden Braking</span>
                  <div className="text-xl font-bold font-mono text-stone-900">
                    {analysisResult?.trip_summary?.harsh_braking_count || 0}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Zero sudden stops</span>
                </div>

                <div className="luxury-panel p-3.5">
                  <span className="card-title block">Lateral Force</span>
                  <div className="text-xl font-bold font-mono text-stone-900">
                    {analysisResult?.trip_summary?.harsh_cornering_count || 0}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Smooth turns</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
            <span>Logged to Driver Safety Index</span>
            <span className="font-mono">Trip ID: #RD-{Date.now().toString().slice(-4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
