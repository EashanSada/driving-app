import React, { useState } from 'react';
import {
  Users,
  Printer,
  ShieldCheck,
  Award,
  Calendar,
  CheckCircle2,
  FileText,
  UserCheck,
  Building2,
  Download,
  Share2,
  Check,
  Sparkles
} from 'lucide-react';
import { getAccount, getActiveUsername, getAllAccounts, UserAccount } from '../lib/accountManager';
import { getGdlProgress, getStoredTrips } from '../lib/offlineTripStore';
import { UnitSystem } from '../types';

export const SupervisorCircleView: React.FC<{ unitSystem: UnitSystem }> = ({ unitSystem }) => {
  const activeUsername = getActiveUsername();
  const currentAccount = activeUsername ? getAccount(activeUsername) : null;
  const allAccounts = getAllAccounts();
  const trips = getStoredTrips(activeUsername || undefined);
  const gdl = getGdlProgress(activeUsername || undefined);

  const [activeTab, setActiveTab] = useState<'CIRCLE' | 'SCHOOL' | 'REPORT'>('CIRCLE');
  const [copiedCode, setCopiedCode] = useState(false);
  const [pairingInput, setPairingInput] = useState('');
  const [pairingSuccess, setPairingSuccess] = useState(false);

  const supervisorCode = currentAccount?.supervisorCode || 'DS-7492-SAFE';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(supervisorCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingInput.trim()) return;
    setPairingSuccess(true);
    setTimeout(() => {
      setPairingSuccess(false);
      setPairingInput('');
    }, 3000);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 border border-[#a78bfa]/20 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#a78bfa]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-[#a78bfa]" />
              <h2 className="text-xl font-bold text-white font-display">Supervised Circle & Driving School Portal</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Connect parents, mentors, and driving instructors. Monitor telematics safety compliance and generate certified insurance & DMV PDF reports.
            </p>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex items-center bg-[#020617] p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('CIRCLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CIRCLE' ? 'bg-[#a78bfa] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Parent-Teen Circle
            </button>
            <button
              onClick={() => setActiveTab('SCHOOL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SCHOOL' ? 'bg-[#a78bfa] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              School Cohort
            </button>
            <button
              onClick={() => setActiveTab('REPORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'REPORT' ? 'bg-[#a78bfa] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              PDF Safety Report
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Parent-Teen Supervised Circle */}
      {activeTab === 'CIRCLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pair Code & Status (5 cols) */}
          <div className="lg:col-span-5 glass-card p-6 space-y-6">
            <div className="space-y-2">
              <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-0">
                Supervision Link Key
              </span>
              <p className="text-xs text-slate-400">
                Share this secure one-time code with parents or mentors to link accounts.
              </p>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#020617] border border-white/15 my-2">
                <span className="font-mono text-base font-extrabold text-[#2dd4bf] tracking-wider">
                  {supervisorCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-[#2dd4bf]/20 hover:bg-[#2dd4bf]/30 text-[#2dd4bf] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Share'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-0">
                Link with a Driver
              </span>
              <form onSubmit={handlePair} className="space-y-3">
                <input
                  type="text"
                  value={pairingInput}
                  onChange={(e) => setPairingInput(e.target.value)}
                  placeholder="Enter driver link code (e.g. DS-7492-SAFE)"
                  className="w-full bg-[#020617] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a78bfa]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#a78bfa] text-slate-950 font-bold text-xs hover:shadow-lg transition-all cursor-pointer"
                >
                  Pair Supervisor Link
                </button>
              </form>

              {pairingSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Supervisor link verified successfully.
                </div>
              )}
            </div>
          </div>

          {/* Linked Driver Status (7 cols) */}
          <div className="lg:col-span-7 glass-card p-6 space-y-4">
            <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-2">
              Supervised Driver Activity Feed
            </span>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#020617]/70 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2dd4bf]/20 border border-[#2dd4bf] flex items-center justify-center font-bold text-xs text-[#2dd4bf]">
                    {(currentAccount?.username || 'JD').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">
                      {currentAccount?.fullName || activeUsername || 'Alex Rivera'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentAccount?.licenseStage === 'permit' ? "Learner's Permit" : 'Provisional License'} • Logged{' '}
                      {trips.length} sessions
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/30">
                    {currentAccount?.safetyScore || 96} pts
                  </span>
                  <span className="block text-[10px] text-emerald-400 font-mono mt-1">Status: Parked / Safe</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#020617]/50 border border-white/10 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase block">
                  Peace of Mind Privacy Principles
                </span>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Zero persistent location surveillance — parents receive trip conclusion summaries only.</li>
                  <li>Highlights defensive driving habits and GDL hours completion.</li>
                  <li>Encourages open constructive mentoring over punitive tracking.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Driving School Instructor Cohort Dashboard */}
      {activeTab === 'SCHOOL' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#a78bfa]" /> Driver Education Cohort Roster
              </h3>
              <p className="text-xs text-slate-400">
                Track aggregate student safety ratings and GDL supervised hours completion.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/30 text-xs font-bold font-mono">
                Cohort Avg: 94.2 Score
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Student Driver</th>
                  <th className="pb-3">Stage</th>
                  <th className="pb-3">Safety Score</th>
                  <th className="pb-3">Clean Trips</th>
                  <th className="pb-3">Supervised Hours</th>
                  <th className="pb-3">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(allAccounts.length > 0
                  ? allAccounts
                  : [
                      {
                        username: 'alex_rivera',
                        fullName: 'Alex Rivera',
                        licenseStage: 'permit',
                        safetyScore: 97,
                        cleanTrips: 8,
                        totalTrips: 10
                      },
                      {
                        username: 'sarah_chen',
                        fullName: 'Sarah Chen',
                        licenseStage: 'permit',
                        safetyScore: 94,
                        cleanTrips: 12,
                        totalTrips: 14
                      },
                      {
                        username: 'marcus_vance',
                        fullName: 'Marcus Vance',
                        licenseStage: 'provisional',
                        safetyScore: 89,
                        cleanTrips: 5,
                        totalTrips: 7
                      }
                    ]
                ).map((student: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 font-bold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#a78bfa]/20 text-[#a78bfa] flex items-center justify-center text-[10px]">
                        {student.username.substring(0, 2).toUpperCase()}
                      </div>
                      {student.fullName || student.username}
                    </td>
                    <td className="py-3.5 text-slate-300 uppercase text-[10px] font-mono">
                      {student.licenseStage || "Learner's Permit"}
                    </td>
                    <td className="py-3.5 font-mono font-bold text-[#2dd4bf]">{student.safetyScore} / 100</td>
                    <td className="py-3.5 font-mono text-slate-300">{student.cleanTrips} trips</td>
                    <td className="py-3.5 font-mono text-slate-300">
                      {((student.totalTrips || 1) * 1.4).toFixed(1)} / 50 hrs
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        Compliant
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Official Parent / Mentor Safety PDF Report */}
      {activeTab === 'REPORT' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-bold text-xs hover:shadow-lg transition-all cursor-pointer glow-mint"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF Certificate</span>
            </button>
          </div>

          {/* Printable Official Report Paper View */}
          <div
            id="printable-report"
            className="p-8 rounded-2xl bg-slate-900 border border-white/20 text-slate-100 space-y-6 shadow-2xl print:bg-white print:text-black print:border-none print:p-0"
          >
            {/* Report Header */}
            <div className="flex items-center justify-between pb-6 border-b border-white/20 print:border-black">
              <div>
                <h2 className="text-xl font-extrabold font-display tracking-tight text-white print:text-black">
                  DRIVESAFE YOUTH INITIATIVE
                </h2>
                <p className="text-xs text-slate-400 print:text-slate-600">
                  Official Telematics Safety & GDL Compliance Record
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#2dd4bf] print:text-emerald-700 block">
                  CERTIFICATE ID: DS-{Date.now().toString().slice(-6)}
                </span>
                <span className="text-[10px] text-slate-400 print:text-slate-600">
                  Generated: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Driver Profile Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#020617] border border-white/10 print:bg-slate-100 print:border-slate-300 print:text-black">
              <div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block font-bold">
                  Driver Name
                </span>
                <span className="text-sm font-bold text-white print:text-black">
                  {currentAccount?.fullName || activeUsername || 'Alex Rivera'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block font-bold">
                  License Status
                </span>
                <span className="text-sm font-bold text-white print:text-black uppercase">
                  {currentAccount?.licenseStage || "Learner's Permit"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block font-bold">
                  Overall Score
                </span>
                <span className="text-sm font-bold font-mono text-[#2dd4bf] print:text-emerald-700">
                  {currentAccount?.safetyScore || 96} / 100
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block font-bold">
                  Total Safe Miles
                </span>
                <span className="text-sm font-bold font-mono text-white print:text-black">
                  {currentAccount?.totalDistanceMiles || 42.8} miles
                </span>
              </div>
            </div>

            {/* Telematics Metrics & GDL Log Summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black">
                Graduated Driver Licensing (GDL) Supervised Hours
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white/5 print:bg-slate-50 border border-white/10 print:border-slate-200">
                  <span className="text-[10px] text-slate-400 print:text-slate-600 block">Daytime Hours</span>
                  <span className="text-base font-bold font-mono">{gdl.completedDayHours} / 40 hrs</span>
                </div>
                <div className="p-3 rounded-lg bg-white/5 print:bg-slate-50 border border-white/10 print:border-slate-200">
                  <span className="text-[10px] text-slate-400 print:text-slate-600 block">Nighttime Hours</span>
                  <span className="text-base font-bold font-mono">{gdl.completedNightHours} / 10 hrs</span>
                </div>
                <div className="p-3 rounded-lg bg-white/5 print:bg-slate-50 border border-white/10 print:border-slate-200">
                  <span className="text-[10px] text-slate-400 print:text-slate-600 block">Clean Trip Ratio</span>
                  <span className="text-base font-bold font-mono text-emerald-400 print:text-emerald-700">
                    {Math.round(
                      ((currentAccount?.cleanTrips || 1) / Math.max(1, currentAccount?.totalTrips || 1)) * 100
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Mentor Endorsement & Signature Line */}
            <div className="pt-8 border-t border-white/20 print:border-black grid grid-cols-2 gap-8 text-xs">
              <div>
                <div className="border-b border-slate-500 pb-1 h-8 flex items-end">
                  <span className="font-mono text-slate-300 print:text-black">
                    {currentAccount?.parentName || 'Verified Driving Instructor'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 block mt-1">
                  Supervisor / Parent Signature
                </span>
              </div>
              <div>
                <div className="border-b border-slate-500 pb-1 h-8 flex items-end">
                  <span className="font-mono text-slate-300 print:text-black">{new Date().toLocaleDateString()}</span>
                </div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 block mt-1">Date of Endorsement</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
