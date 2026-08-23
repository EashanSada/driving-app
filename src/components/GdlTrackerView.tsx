import React, { useState } from 'react';
import {
  GraduationCap,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  Plus,
  ShieldCheck,
  FileCheck,
  Calendar,
  X
} from 'lucide-react';
import { GdlProgress } from '../types';
import { getGdlProgress, saveGdlProgress } from '../lib/offlineTripStore';
import { getActiveUsername, getAccount } from '../lib/accountManager';
import { RadianSymbol } from './RadianSymbol';

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
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="luxury-card p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                GDL Licensing Hours Tracker
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Official 50-Hour state-mandated supervised driving hours for {account?.fullName || activeUsername || 'Permit Driver'}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4 text-[#A38258]" />
              <span>Export Certificate (PDF)</span>
            </button>

            <button
              onClick={() => setShowLogModal(true)}
              className="btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 fill-stone-950" />
              <span>Log Hours</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main GDL Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Overall Progress Card (5 cols) */}
        <div className="lg:col-span-5 luxury-card p-6 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="card-title mb-0">Total Supervised Hours</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C5A880]/15 text-[#A38258] border border-[#C5A880]/30 font-mono">
                {totalPercentage}% Target
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-black text-stone-900 font-display tracking-tight">
                {totalCompleted}{' '}
                <span className="text-base font-normal text-stone-400">
                  / {progress.totalRequiredHours} hrs
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {Math.max(0, progress.totalRequiredHours - totalCompleted).toFixed(1)} hours remaining until road test qualification.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-stone-100">
            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C5A880] to-stone-900 rounded-full transition-all duration-500"
                style={{ width: `${totalPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span>{progress.supervisedTripsCount} verified drives logged</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> State Compliant
              </span>
            </div>
          </div>
        </div>

        {/* Day vs Night Breakdown (7 cols) */}
        <div className="lg:col-span-7 luxury-card p-6 space-y-4 flex flex-col justify-between">
          <span className="card-title block">State Requirement Breakdown</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Daylight Driving */}
            <div className="luxury-panel p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-stone-900">Daytime Hours</span>
                </div>
                <span className="text-xs font-bold font-mono text-stone-700">{dayPercentage}%</span>
              </div>
              <div className="text-2xl font-black text-stone-900 font-display">
                {progress.completedDayHours}{' '}
                <span className="text-xs font-normal text-stone-400">/ {progress.requiredDayHours}h</span>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${dayPercentage}%` }} />
              </div>
            </div>

            {/* Nighttime Driving */}
            <div className="luxury-panel p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-stone-900">Nighttime Hours</span>
                </div>
                <span className="text-xs font-bold font-mono text-stone-700">{nightPercentage}%</span>
              </div>
              <div className="text-2xl font-black text-stone-900 font-display">
                {progress.completedNightHours}{' '}
                <span className="text-xs font-normal text-stone-400">/ {progress.requiredNightHours}h</span>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${nightPercentage}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
            <span>Target Road Test Qualification Date:</span>
            <span className="font-mono font-bold text-stone-900">{progress.targetTestDate}</span>
          </div>
        </div>
      </div>

      {/* Manual Hour Entry Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="luxury-card max-w-md w-full p-6 border border-[#C5A880]/30 shadow-2xl relative">
            <button
              onClick={() => setShowLogModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <form onSubmit={handleAddManualHours} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 font-display">Log Supervised Hours</h3>
                <p className="text-xs text-stone-500">Record a supervised session with a parent or instructor.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Session Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    required
                    value={logHours}
                    onChange={(e) => setLogHours(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Driving Condition</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLogType('DAY')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        logType === 'DAY'
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-stone-50 border-stone-200 text-stone-500'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" /> Daytime
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogType('NIGHT')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        logType === 'NIGHT'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                          : 'bg-stone-50 border-stone-200 text-stone-500'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" /> Nighttime
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Supervisor Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={mentorNotes}
                    onChange={(e) => setMentorNotes(e.target.value)}
                    placeholder="e.g. Highway merging and parallel parking practice"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Save Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
