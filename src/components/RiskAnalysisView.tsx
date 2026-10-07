import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, BarChart2, Play, AlertTriangle, Check, MapPin } from 'lucide-react';
import { RiskAnalysisResult, LanguageCode, UnitSystem, HazardReport } from '../types';
import { RadianSymbol } from './RadianSymbol';
import { analyzeRiskLocally } from '../lib/riskAnalyzer';
import { submitPostDriveHazard } from '../lib/hazardManager';
import { NativeHaptics } from '../lib/nativeMobileBridge';

interface RiskAnalysisViewProps {
  lastTripSummary: any;
  currentLanguage: LanguageCode;
  unitSystem: UnitSystem;
  activeAccount?: any;
  onNavigateToCockpit?: () => void;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({
  lastTripSummary,
  onNavigateToCockpit
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'FINDINGS' | 'TELEMATICS'>('FINDINGS');
  
  // Post-drive hazard survey state
  const [hazardSurveySelected, setHazardSurveySelected] = useState<string | null>(null);
  const [hazardSurveySubmitted, setHazardSurveySubmitted] = useState(false);
  const [submittingHazard, setSubmittingHazard] = useState(false);

  const [analysisResult] = useState<RiskAnalysisResult>(() => {
    if (lastTripSummary?.classification) {
      return {
        status: 'success',
        driver_id: lastTripSummary.driver_id || 'driver',
        trip_summary: lastTripSummary.trip_summary || {
          data_points: lastTripSummary.telemetry?.length || 0,
          avg_velocity_kmh: 0,
          max_velocity_kmh: 0,
          velocity_std_dev: 0,
          max_g_force: 0,
          g_force_std_dev: 0,
          harsh_braking_count: lastTripSummary.harshBrakingCount || 0,
          harsh_cornering_count: lastTripSummary.harshCorneringCount || 0,
          distanceKm: lastTripSummary.distanceKm || 0
        },
        classification: lastTripSummary.classification,
        sub_scores: lastTripSummary.sub_scores || {
          speed_compliance: 100,
          braking_smoothness: 100,
          cornering_stability: 100
        },
        key_risk_factors: lastTripSummary.key_risk_factors || [
          'Smooth handling: Phone remained stable throughout the session.',
          'Zero sudden motion or harsh events detected.'
        ]
      };
    }
    // Fallback: evaluate payload directly
    return analyzeRiskLocally(lastTripSummary || {});
  });

  const score = analysisResult?.classification?.safety_score ?? 100;
  
  // Dynamic grade info
  const getGradeInfo = (pts: number) => {
    if (pts >= 95) return { grade: 'Grade A+', label: 'Exceptional Stability', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (pts >= 88) return { grade: 'Grade A', label: 'Safe Driver', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (pts >= 75) return { grade: 'Grade B', label: 'Good Discipline', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    if (pts >= 65) return { grade: 'Grade C', label: 'Needs Improvement', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { grade: 'High Risk', label: 'Erratic Motion Detected', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
  };

  const gradeInfo = getGradeInfo(score);
  const harshBrakes = analysisResult?.trip_summary?.harsh_braking_count || 0;
  const harshTurns = analysisResult?.trip_summary?.harsh_cornering_count || 0;
  const totalIncidents = harshBrakes + harshTurns;
  const subScores = analysisResult?.sub_scores || {
    speed_compliance: 100,
    braking_smoothness: 100,
    cornering_stability: 100
  };

  const handleHazardReport = async (hazardType: HazardReport['hazard_type'] | 'ALL_CLEAR') => {
    setHazardSurveySelected(hazardType);
    NativeHaptics.medium();

    if (hazardType === 'ALL_CLEAR') {
      setHazardSurveySubmitted(true);
      return;
    }

    setSubmittingHazard(true);
    await submitPostDriveHazard(hazardType);
    setSubmittingHazard(false);
    setHazardSurveySubmitted(true);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Executive Header Banner */}
      <div className="luxury-card p-5 sm:p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <RadianSymbol size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                Trip Safety Evaluation
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Objective kinematic breakdown and motion vector diagnostics.
              </p>
            </div>
          </div>

          {onNavigateToCockpit && (
            <button
              onClick={onNavigateToCockpit}
              className="btn-gold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md font-extrabold uppercase tracking-wider"
            >
              <Play className="w-3.5 h-3.5 fill-stone-950" />
              <span>Start Next Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Executive Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Big Safety Rating Score (5 cols) */}
        <div className="lg:col-span-5 luxury-card p-6 flex flex-col items-center justify-between text-center min-h-[380px]">
          <div className="w-full flex items-center justify-between">
            <span className="card-title mb-0">Trip Safety Score</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${gradeInfo.bg} ${gradeInfo.color}`}>
              {score >= 75 ? 'Compliant' : 'Review Needed'}
            </span>
          </div>

          {/* Luxury Circular Score Badge */}
          <div className="my-5 relative flex items-center justify-center">
            <div className="w-44 h-44 rounded-full border-4 border-[#C5A880]/20 flex flex-col items-center justify-center bg-gradient-to-b from-stone-50 to-white shadow-inner">
              <div className="text-5xl font-black text-stone-900 font-display tracking-tight">
                {score.toFixed(0)}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#A38258] mt-[-2px]">
                {gradeInfo.grade}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5">{gradeInfo.label}</span>
            </div>
          </div>

          {/* Sub-Score Breakdown Bars */}
          <div className="w-full space-y-2 pt-2 border-t border-stone-100 text-left">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                <span>Speed &amp; Pace Stability</span>
                <span className="font-mono">{subScores.speed_compliance}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${subScores.speed_compliance}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                <span>Deceleration &amp; Braking</span>
                <span className="font-mono">{subScores.braking_smoothness}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C5A880] rounded-full transition-all"
                  style={{ width: `${subScores.braking_smoothness}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                <span>Lateral Steering Stability</span>
                <span className="font-mono">{subScores.cornering_stability}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${subScores.cornering_stability}%` }}
                />
              </div>
            </div>
          </div>

          <div className="w-full pt-3 mt-3 border-t border-stone-100 flex items-center justify-around text-xs">
            <div>
              <span className="text-[10px] text-stone-400 block uppercase font-bold">Harsh Events</span>
              <span className="text-sm font-bold text-stone-900 font-mono">
                {totalIncidents} {totalIncidents === 1 ? 'Event' : 'Events'}
              </span>
            </div>
            <div className="w-px h-6 bg-stone-200" />
            <div>
              <span className="text-[10px] text-stone-400 block uppercase font-bold">Peak Force</span>
              <span className="text-sm font-bold text-stone-900 font-mono">
                {analysisResult?.trip_summary?.max_g_force?.toFixed(2) || '0.00'} G
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Findings & Telemetry Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Post-Drive Hazard Report Survey */}
          <div className="luxury-card p-5 border border-[#C5A880]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900 font-display">Road Hazard Survey</h3>
              </div>
              <span className="text-[10px] text-stone-400 font-medium">1-Tap Community Alert</span>
            </div>

            {!hazardSurveySubmitted ? (
              <>
                <p className="text-xs text-stone-600">
                  Did you encounter any hazards or road issues on this trip?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => handleHazardReport('POTHOLE')}
                    disabled={submittingHazard}
                    className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-800 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>🕳️</span>
                    <span>Pothole</span>
                  </button>

                  <button
                    onClick={() => handleHazardReport('CONSTRUCTION')}
                    disabled={submittingHazard}
                    className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-800 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>🚧</span>
                    <span>Construction</span>
                  </button>

                  <button
                    onClick={() => handleHazardReport('BLACK_ICE')}
                    disabled={submittingHazard}
                    className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-800 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>❄️</span>
                    <span>Slippery / Ice</span>
                  </button>

                  <button
                    onClick={() => handleHazardReport('HIGH_ACCIDENT_ZONE')}
                    disabled={submittingHazard}
                    className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-800 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>⚠️</span>
                    <span>Traffic / Crash</span>
                  </button>

                  <button
                    onClick={() => handleHazardReport('ALL_CLEAR')}
                    className="col-span-2 sm:col-span-2 p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>All Clear (No Hazards)</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {hazardSurveySelected === 'ALL_CLEAR'
                    ? 'Trip marked all clear! Drive safely.'
                    : `Reported ${hazardSurveySelected?.replace(/_/g, ' ')}! Thank you for alerting other drivers.`}
                </span>
              </div>
            )}
          </div>

          {/* Clean Segmented Sub-Tab Switcher */}
          <div className="luxury-card p-5">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/80 mb-4">
              <button
                onClick={() => setSelectedSubTab('FINDINGS')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedSubTab === 'FINDINGS'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#A38258]" />
                <span>Kinematic Observations</span>
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
                <span>Sensor Metrics</span>
              </button>
            </div>

            {/* Sub-Tab 1: Real Dynamic Observations */}
            {selectedSubTab === 'FINDINGS' && (
              <div className="space-y-2 animate-in fade-in">
                {(analysisResult?.key_risk_factors || []).map((factor, idx) => {
                  const isNegative = factor.includes('-') || factor.toLowerCase().includes('abrupt') || factor.toLowerCase().includes('instability') || factor.toLowerCase().includes('aggressive') || factor.toLowerCase().includes('excessive');
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 text-xs p-3 rounded-xl border ${
                        isNegative
                          ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                          : 'bg-emerald-50/60 border-emerald-200/70 text-emerald-900'
                      }`}
                    >
                      {isNegative ? (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug font-medium">{factor}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-Tab 2: Telemetry Metrics */}
            {selectedSubTab === 'TELEMATICS' && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                <div className="luxury-panel p-3.5">
                  <span className="card-title block">Peak G-Force</span>
                  <div className="text-xl font-bold font-mono text-stone-900">
                    {analysisResult?.trip_summary?.max_g_force?.toFixed(2) || '0.00'} G
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    {(analysisResult?.trip_summary?.max_g_force || 0) < 0.45 ? 'Smooth range' : 'High dynamic force'}
                  </span>
                </div>

                <div className="luxury-panel p-3.5">
                  <span className="card-title block">Velocity Variation</span>
                  <div className="text-xl font-bold font-mono text-stone-900">
                    {analysisResult?.trip_summary?.velocity_std_dev?.toFixed(1) || '0.0'} σ
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">Steady throttle control</span>
                </div>

                <div className="luxury-panel p-3.5">
                  <span className="card-title block">Sudden Braking</span>
                  <div className={`text-xl font-bold font-mono ${harshBrakes > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                    {harshBrakes}
                  </div>
                  <span className="text-[10px] font-medium mt-0.5 block text-stone-500">
                    {harshBrakes === 0 ? 'Zero abrupt stops' : `${harshBrakes} deceleration events`}
                  </span>
                </div>

                <div className="luxury-panel p-3.5">
                  <span className="card-title block">Lateral Steering Force</span>
                  <div className={`text-xl font-bold font-mono ${harshTurns > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                    {harshTurns}
                  </div>
                  <span className="text-[10px] font-medium mt-0.5 block text-stone-500">
                    {harshTurns === 0 ? 'Smooth, progressive turns' : `${harshTurns} aggressive turns`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
