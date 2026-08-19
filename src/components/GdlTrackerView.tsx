import React, { useState } from 'react';
import {
  GraduationCap,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  Plus,
  ShieldCheck,
  Award,
  AlertCircle,
  FileCheck,
  Calendar
} from 'lucide-react';
import { GdlProgress } from '../types';
import { getGdlProgress, saveGdlProgress } from '../lib/offlineTripStore';
import { getActiveUsername, getAccount } from '../lib/accountManager';

export const GdlTrackerView: React.FC = () => {
  const activeUsername = getActiveUsername();
  const account = activeUsername ? getAccount(activeUsername) : null;
  const [progress, setProgress] = useState<GdlProgress>(() => getGdlProgress(activeUsername || undefined));
  const [showLogModal, setShowLogModal] = useState(false);
  const [logHours, setLogHours] = useState('1.5');
  const [logType, setLogType] = useState<'DAY' | 'NIGHT'>('DAY');
  const [mentorNotes, setMentorNotes] = useState('');

  const totalCompleted = Number((progress.completedDayHours + progress.completedNightHours).toFixed(1));
  const totalPercentage = Math.min(100, Math.round((totalCompleted / progress.totalRequiredHours) * 100));
  const dayPercentage = Math.min(100, Math.round((progress.completedDayHours / progress.requiredDayHours) * 100));
  const nightPercentage = Math.min(100, Math.round((progress.completedNightHours / progress.requiredNightHours) * 100));

  const handleAddManualHours = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(logHours) || 0;
    if (hoursNum <= 0) return;

    const updated: GdlProgress = {
      ...progress,
      completedDayHours:
        logType === 'DAY'
          ? Number((progress.completedDayHours + hoursNum).toFixed(1))
          : progress.completedDayHours,
      completedNightHours:
        logType === 'NIGHT'
          ? Number((progress.completedNightHours + hoursNum).toFixed(1))
          : progress.completedNightHours,
      supervisedTripsCount: progress.supervisedTripsCount + 1
    };

    setProgress(updated);
    if (activeUsername) {
      saveGdlProgress(activeUsername, updated);
    }
    setShowLogModal(false);
    setMentorNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 border border-[#2dd4bf]/20 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-5 h-5 text-[#2dd4bf]" />
              <h2 className="text-xl font-bold text-white font-display">
                Graduated Driver Licensing (GDL) Tracker
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Track your state-mandated supervised driving hours for {account?.fullName || activeUsername || 'Driver'}. Auto-logs trips from the HUD and calculates day vs. night driving requirements.
            </p>
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-bold text-xs hover:shadow-lg transition-all cursor-pointer glow-mint shrink-0"
          >
            <Plus className="w-4 h-4 fill-slate-950" />
            <span>Log Supervised Hours</span>
          </button>
        </div>
      </div>

      {/* Main GDL Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Completion Metric Card (5 cols) */}
        <div className="lg:col-span-5 glass-card p-6 space-y-6 flex flex-col justify-between">
          <div className="text-center space-y-3">
            <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-0">
              Total Licensing Hours Progress
            </span>

            <div className="flex items-center justify-center my-4">
              <div className="relative flex flex-col items-center justify-center w-40 h-40 rounded-full bg-[#020617] border-4 border-[#2dd4bf]/40 shadow-2xl glow-mint">
                <span className="text-3xl font-extrabold text-white font-mono">{totalCompleted}h</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#2dd4bf] mt-0.5">
                  of {progress.totalRequiredHours}h required
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-1">{totalPercentage}% Complete</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{progress.supervisedTripsCount} Supervised Sessions Logged</span>
            </div>
          </div>

          {/* Licensing Key Dates */}
          <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-[#2dd4bf]" /> Permit Issue Date:
              </span>
              <span className="font-mono text-white font-bold">{progress.permitIssueDate}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-[#a78bfa]" /> Target Driving Test:
              </span>
              <span className="font-mono text-[#a78bfa] font-bold">{progress.targetTestDate}</span>
            </div>
          </div>
        </div>

        {/* Day & Night Breakdown Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Daytime Hours Card */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Sun className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Daytime Supervised Hours</h3>
                  <p className="text-[11px] text-slate-400">Normal daylight road practice with adult supervisor</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-white">
                  {progress.completedDayHours} / {progress.requiredDayHours}h
                </span>
                <span className="block text-[10px] text-amber-400 font-mono font-semibold">{dayPercentage}%</span>
              </div>
            </div>

            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${dayPercentage}%` }}
              />
            </div>
          </div>

          {/* Nighttime Hours Card */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#a78bfa]/10 border border-[#a78bfa]/30">
                  <Moon className="w-4 h-4 text-[#a78bfa]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nighttime Supervised Hours</h3>
                  <p className="text-[11px] text-slate-400">Dusk and nighttime driving with low-light hazards</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-white">
                  {progress.completedNightHours} / {progress.requiredNightHours}h
                </span>
                <span className="block text-[10px] text-[#a78bfa] font-mono font-semibold">{nightPercentage}%</span>
              </div>
            </div>

            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-[#a78bfa] h-full rounded-full transition-all duration-500"
                style={{ width: `${nightPercentage}%` }}
              />
            </div>
          </div>

          {/* Licensing Readiness Checklist */}
          <div className="p-4 rounded-xl bg-[#020617]/70 border border-white/10 space-y-2">
            <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-1">
              State DMV Compliance Checklist
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    progress.completedDayHours >= progress.requiredDayHours ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                />
                <span>40 Daytime Hours Complete</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    progress.completedNightHours >= progress.requiredNightHours
                      ? 'text-emerald-400'
                      : 'text-slate-600'
                  }`}
                />
                <span>10 Nighttime Hours Complete</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Harsh Incident Log Validated</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mentor Endorsement Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card p-6 max-w-md w-full border border-[#2dd4bf]/30 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#2dd4bf]" /> Log Supervised Driving Practice
            </h3>

            <form onSubmit={handleAddManualHours} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Session Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogType('DAY')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border ${
                      logType === 'DAY'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#020617] border-white/10 text-slate-400'
                    }`}
                  >
                    <Sun className="w-4 h-4" /> Daytime
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogType('NIGHT')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border ${
                      logType === 'NIGHT'
                        ? 'bg-[#a78bfa]/20 border-[#a78bfa] text-[#a78bfa]'
                        : 'bg-[#020617] border-white/10 text-slate-400'
                    }`}
                  >
                    <Moon className="w-4 h-4" /> Nighttime
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Duration (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="8"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  className="w-full bg-[#020617] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Supervisor Notes</label>
                <textarea
                  value={mentorNotes}
                  onChange={(e) => setMentorNotes(e.target.value)}
                  placeholder="e.g. Highway merging and parallel parking practice"
                  rows={2}
                  className="w-full bg-[#020617] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#2dd4bf] text-slate-950 text-xs font-bold hover:shadow-lg transition-all cursor-pointer glow-mint"
                >
                  Confirm Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
