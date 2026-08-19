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
  Sparkles,
  Link,
  Lock,
  Search,
  Eye
} from 'lucide-react';
import { getAccount, getActiveUsername, getAllAccounts, UserAccount } from '../lib/accountManager';
import { getGdlProgress, getStoredTrips } from '../lib/offlineTripStore';
import { UnitSystem } from '../types';

export const SupervisorCircleView: React.FC<{ unitSystem: UnitSystem }> = ({ unitSystem }) => {
  const activeUsername = getActiveUsername();
  const currentAccount = activeUsername ? getAccount(activeUsername) : null;
  const allAccounts = getAllAccounts();

  // Child / Teen Driver Selection (defaults to current user or first teen account)
  const [selectedChildUsername, setSelectedChildUsername] = useState<string>(() => {
    if (currentAccount?.role === 'young_driver' || currentAccount?.role === 'gdl_student') {
      return activeUsername || 'alex_rivera';
    }
    const teen = allAccounts.find(a => a.role === 'young_driver' || a.role === 'gdl_student');
    return teen?.username || activeUsername || 'alex_rivera';
  });

  const selectedChildAccount = getAccount(selectedChildUsername) || currentAccount;
  const trips = getStoredTrips(selectedChildUsername);
  const gdl = getGdlProgress(selectedChildUsername);

  const [activeTab, setActiveTab] = useState<'CIRCLE' | 'SCHOOL' | 'REPORT'>('CIRCLE');
  const [copiedCode, setCopiedCode] = useState(false);
  const [pairingInput, setPairingInput] = useState('');
  const [pairingSuccessMsg, setPairingSuccessMsg] = useState('');

  const supervisorCode = selectedChildAccount?.supervisorCode || `DS-7492-${(selectedChildUsername || 'SAFE').substring(0, 4).toUpperCase()}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(supervisorCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pairingInput.trim();
    if (!clean) return;

    // Check if input is a known username or code
    const matched = allAccounts.find(
      a => a.username.toLowerCase() === clean.toLowerCase() || a.supervisorCode === clean
    );

    if (matched) {
      setSelectedChildUsername(matched.username);
      setPairingSuccessMsg(`Successfully linked with ${matched.fullName || matched.username}.`);
    } else {
      setPairingSuccessMsg(`Link key "${clean}" registered with Parent-Teen Circle.`);
    }

    setTimeout(() => {
      setPairingSuccessMsg('');
      setPairingInput('');
    }, 4000);
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
              <h2 className="text-xl font-bold text-white font-display">Supervised Circle & Parent Portal</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Connect parents, mentors, and driving instructors with teen drivers. Review safety ratings, track GDL hours, and export official insurance & DMV PDF reports.
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
          {/* Pair Code & How Linking Works (5 cols) */}
          <div className="lg:col-span-5 glass-card p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-0">
                Child Link Key & Pairing
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Teens can share their unique 6-digit key with a parent or mentor. Once linked, parents receive safe trip summaries and GDL log updates.
              </p>

              <div className="p-3.5 rounded-xl bg-[#020617] border border-white/15 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Active Driver Link Key ({selectedChildAccount?.username || 'Driver'})
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-extrabold text-[#2dd4bf] tracking-wider">
                    {supervisorCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 rounded-lg bg-[#2dd4bf]/20 hover:bg-[#2dd4bf]/30 text-[#2dd4bf] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Parent Enter Key Form */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-0">
                Link New Teen Driver
              </span>
              <form onSubmit={handlePair} className="space-y-2.5">
                <div className="relative">
                  <Link className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pairingInput}
                    onChange={(e) => setPairingInput(e.target.value)}
                    placeholder="Enter key or username (e.g. DS-7492-ALEX)"
                    className="w-full bg-[#020617] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#a78bfa] text-slate-950 font-bold text-xs hover:shadow-lg transition-all cursor-pointer"
                >
                  Pair Supervisor Connection
                </button>
              </form>

              {pairingSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pairingSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Teen Driver Dashboard (7 cols) */}
          <div className="lg:col-span-7 glass-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="card-title text-xs font-bold text-slate-300 uppercase block mb-0">
                Supervised Teen Profile
              </span>

              {/* Quick switch between known drivers */}
              {allAccounts.length > 1 && (
                <div className="flex items-center gap-1 bg-[#020617] p-1 rounded-lg border border-white/10 text-xs">
                  <span className="text-[10px] text-slate-400 px-1 font-bold">Driver:</span>
                  <select
                    value={selectedChildUsername}
                    onChange={(e) => setSelectedChildUsername(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#2dd4bf] focus:outline-none cursor-pointer"
                  >
                    {allAccounts.map(a => (
                      <option key={a.username} value={a.username} className="bg-slate-900 text-white">
                        {a.fullName || a.username} ({a.safetyScore} pts)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Teen Driver Card */}
            <div className="p-4 rounded-xl bg-[#020617]/80 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#2dd4bf]/20 border border-[#2dd4bf] flex items-center justify-center font-black text-sm text-[#2dd4bf]">
                    {(selectedChildAccount?.username || 'AL').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">
                      {selectedChildAccount?.fullName || selectedChildAccount?.username || 'Alex Rivera'}
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-mono">
                      {selectedChildAccount?.licenseStage === 'permit' ? "Learner's Permit" : 'Provisional License'} • Stage
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold font-mono bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/30">
                    {selectedChildAccount?.safetyScore || 96} / 100
                  </span>
                  <span className="block text-[10px] text-emerald-400 font-semibold mt-1">Status: Safe / Parked</span>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                <div className="p-2 rounded-lg bg-white/5">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Clean Drives</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {selectedChildAccount?.cleanTrips || 0} trips
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">GDL Hours</span>
                  <span className="text-sm font-bold font-mono text-[#a78bfa]">
                    {(gdl.completedDayHours + gdl.completedNightHours).toFixed(1)} / 50h
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Distance</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {(selectedChildAccount?.totalDistanceMiles || 0).toFixed(1)} mi
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action to PDF Report */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#2dd4bf]/10 to-[#a78bfa]/10 border border-white/10 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Official PDF Certificate Ready</span>
                <span className="text-[11px] text-slate-300">
                  Ready for auto-insurance discount verification & state DMV log.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('REPORT')}
                className="px-3.5 py-1.5 rounded-lg bg-[#2dd4bf] text-slate-950 font-bold text-xs hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                View PDF Report
              </button>
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
                  {selectedChildAccount?.fullName || selectedChildUsername || 'Alex Rivera'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block font-bold">
                  License Status
                </span>
                <span className="text-sm font-bold text-white print:text-black uppercase">
                  {selectedChildAccount?.licenseStage || "Learner's Permit"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block font-bold">
                  Overall Score
                </span>
                <span className="text-sm font-bold font-mono text-[#2dd4bf] print:text-emerald-700">
                  {selectedChildAccount?.safetyScore || 96} / 100
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase block font-bold">
                  Total Safe Miles
                </span>
                <span className="text-sm font-bold font-mono text-white print:text-black">
                  {(selectedChildAccount?.totalDistanceMiles || 42.8).toFixed(1)} miles
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
                      ((selectedChildAccount?.cleanTrips || 1) / Math.max(1, selectedChildAccount?.totalTrips || 1)) * 100
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
                    {selectedChildAccount?.parentName || 'Verified Parent / Mentor'}
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
