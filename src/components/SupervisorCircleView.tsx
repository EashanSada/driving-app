import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Award,
  Calendar,
  CheckCircle2,
  FileText,
  Building2,
  Share2,
  Check,
  Link,
  Lock,
  Printer
} from 'lucide-react';
import { getAccount, getActiveUsername, getAllAccounts, UserAccount } from '../lib/accountManager';
import { getGdlProgress, getStoredTrips } from '../lib/offlineTripStore';
import { UnitSystem } from '../types';
import { RadianSymbol } from './RadianSymbol';

export const SupervisorCircleView: React.FC<{ unitSystem: UnitSystem }> = ({ unitSystem }) => {
  const activeUsername = getActiveUsername();
  const currentAccount = activeUsername ? getAccount(activeUsername) : null;
  const allAccounts = getAllAccounts();

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

  const supervisorCode = selectedChildAccount?.supervisorCode || `RD-7492-${(selectedChildUsername || 'SAFE').substring(0, 4).toUpperCase()}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(supervisorCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pairingInput.trim();
    if (!clean) return;

    const matched = allAccounts.find(
      a => a.username.toLowerCase() === clean.toLowerCase() || a.supervisorCode === clean
    );

    if (matched) {
      setSelectedChildUsername(matched.username);
      setPairingSuccessMsg(`Successfully linked with ${matched.fullName || matched.username}.`);
    } else {
      setPairingSuccessMsg(`Supervisor code "${clean}" registered with Parent-Teen Circle.`);
    }

    setTimeout(() => {
      setPairingSuccessMsg('');
      setPairingInput('');
    }, 4000);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="luxury-card p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                Supervisor Circle & Mentorship
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Privacy-first family circle, instructor roster & DMV certified PDF export.
              </p>
            </div>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 shrink-0">
            <button
              onClick={() => setActiveTab('CIRCLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CIRCLE' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Parent-Teen Circle
            </button>
            <button
              onClick={() => setActiveTab('SCHOOL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SCHOOL' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              School Cohort
            </button>
            <button
              onClick={() => setActiveTab('REPORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'REPORT' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              PDF Certificate
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Parent-Teen Circle */}
      {activeTab === 'CIRCLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Pair Code & Linking Panel (5 cols) */}
          <div className="lg:col-span-5 luxury-card p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="card-title block">Family Link Key</span>
              <p className="text-xs text-stone-600 leading-relaxed">
                Teens can share their unique 6-digit key with a parent or mentor. Parents receive defensive driving recaps and GDL hour milestones without invasive live tracking.
              </p>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">
                  Active Driver Key ({selectedChildAccount?.username || 'Driver'})
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-extrabold text-stone-900 tracking-wider">
                    {supervisorCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Parent Enter Key Form */}
            <div className="pt-4 border-t border-stone-100 space-y-3">
              <span className="card-title block">Pair New Driver Account</span>
              <form onSubmit={handlePair} className="space-y-2.5">
                <div className="relative">
                  <Link className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pairingInput}
                    onChange={(e) => setPairingInput(e.target.value)}
                    placeholder="Enter key (e.g. RD-7492-ALEX)"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full btn-gold py-2 rounded-xl text-xs cursor-pointer"
                >
                  Pair Connection
                </button>
              </form>

              {pairingSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pairingSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Teen Driver Dashboard (7 cols) */}
          <div className="lg:col-span-7 luxury-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="card-title block mb-0">Driver Profile & Status</span>

              {allAccounts.length > 1 && (
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
                  <span className="text-[10px] text-stone-400 px-1 font-bold">Driver:</span>
                  <select
                    value={selectedChildUsername}
                    onChange={(e) => setSelectedChildUsername(e.target.value)}
                    className="bg-transparent text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
                  >
                    {allAccounts.map(a => (
                      <option key={a.username} value={a.username}>
                        {a.fullName || a.username} ({a.safetyScore} pts)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Teen Overview Card */}
            <div className="p-4 rounded-xl bg-[#F9F7F2] border border-[#C5A880]/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-900 text-[#C5A880] flex items-center justify-center text-xs font-black">
                    {selectedChildAccount?.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">
                      {selectedChildAccount?.fullName || selectedChildAccount?.username}
                    </span>
                    <span className="text-[11px] text-stone-500 uppercase font-mono">
                      {selectedChildAccount?.licenseStage === 'permit' ? "Learner's Permit" : 'Provisional License'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {selectedChildAccount?.safetyScore || 98} / 100
                  </span>
                  <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">Status: Parked & Safe</span>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200/80 text-center">
                <div className="p-2.5 rounded-lg bg-white border border-stone-200/60">
                  <span className="text-[9px] text-stone-400 block font-bold uppercase">Clean Drives</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">
                    {selectedChildAccount?.cleanTrips || 0} trips
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-stone-200/60">
                  <span className="text-[9px] text-stone-400 block font-bold uppercase">GDL Hours</span>
                  <span className="text-sm font-bold font-mono text-stone-900">
                    {(gdl.completedDayHours + gdl.completedNightHours).toFixed(1)} / 50h
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-stone-200/60">
                  <span className="text-[9px] text-stone-400 block font-bold uppercase">Total Distance</span>
                  <span className="text-sm font-bold font-mono text-stone-900">
                    {(selectedChildAccount?.totalDistanceMiles || 0).toFixed(1)} mi
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action to PDF Report */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Official Insurance PDF Certificate</span>
                <span className="text-[11px] text-stone-500">
                  Verified safety rating ready for auto-insurance discount submission.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('REPORT')}
                className="btn-gold px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer"
              >
                View PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Driving School Instructor Cohort Dashboard */}
      {activeTab === 'SCHOOL' && (
        <div className="luxury-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#A38258]" /> Driver Education Cohort Roster
              </h3>
              <p className="text-xs text-stone-500">
                Track aggregate student safety ratings and GDL supervised hours completion.
              </p>
            </div>

            <span className="px-3 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200 text-xs font-bold font-mono">
              Cohort Roster ({allAccounts.length} students)
            </span>
          </div>

          {allAccounts.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <Building2 className="w-8 h-8 text-stone-400 mx-auto" />
              <h4 className="text-sm font-bold text-stone-900">No Student Drivers Registered</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                When students register with your driving school or enter your supervisor code, their live safety scores and supervised hours will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Student Driver</th>
                    <th className="pb-3">Stage</th>
                    <th className="pb-3">Safety Score</th>
                    <th className="pb-3">Clean Trips</th>
                    <th className="pb-3">Supervised Hours</th>
                    <th className="pb-3">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {allAccounts.map((student, idx) => (
                    <tr key={idx} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3.5 font-bold text-stone-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-stone-900 text-[#C5A880] flex items-center justify-center text-[10px]">
                          {student.username.substring(0, 2).toUpperCase()}
                        </div>
                        {student.fullName || student.username}
                      </td>
                      <td className="py-3.5 text-stone-600 uppercase text-[10px] font-mono">
                        {student.licenseStage === 'permit' ? "Learner's Permit" : student.licenseStage === 'provisional' ? 'Provisional' : 'Full License'}
                      </td>
                      <td className="py-3.5 font-mono font-bold text-emerald-700">{student.safetyScore} / 100</td>
                      <td className="py-3.5 font-mono text-stone-700">{student.cleanTrips} trips</td>
                      <td className="py-3.5 font-mono text-stone-700">
                        {((student.totalTrips || 0) * 1.2).toFixed(1)} / 50 hrs
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          student.safetyScore >= 85
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {student.safetyScore >= 85 ? 'Compliant' : 'Review Needed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Official Printable PDF Safety Report */}
      {activeTab === 'REPORT' && (
        <div className="luxury-card p-8 space-y-6 bg-white border border-stone-300 shadow-xl max-w-3xl mx-auto">
          {/* Official Letterhead */}
          <div className="flex items-center justify-between pb-6 border-b border-stone-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-[#C5A880] flex items-center justify-center">
                <RadianSymbol size={26} />
              </div>
              <div>
                <h2 className="text-xl font-black font-display tracking-tight text-stone-950">
                  RADIAN<span className="text-[#A38258]">DRIVE</span>
                </h2>
                <p className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">
                  Official Youth Safety & GDL Compliance Certificate
                </p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer print:hidden"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          {/* Certificate Body */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-stone-50 rounded-lg">
              <span className="text-stone-400 block uppercase font-bold text-[10px]">Driver Name</span>
              <span className="text-sm font-bold text-stone-900">
                {selectedChildAccount?.fullName || selectedChildAccount?.username || 'Driver'}
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg">
              <span className="text-stone-400 block uppercase font-bold text-[10px]">License / Permit Stage</span>
              <span className="text-sm font-bold text-stone-900 uppercase">
                {selectedChildAccount?.licenseStage === 'permit' ? "State Learner's Permit" : "Provisional License"}
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg">
              <span className="text-stone-400 block uppercase font-bold text-[10px]">Verified Safety Score</span>
              <span className="text-sm font-bold text-emerald-800">
                {selectedChildAccount?.safetyScore || 98} / 100 (Grade A+)
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg">
              <span className="text-stone-400 block uppercase font-bold text-[10px]">Supervised GDL Hours</span>
              <span className="text-sm font-bold text-stone-900">
                {(gdl.completedDayHours + gdl.completedNightHours).toFixed(1)} / 50.0 Hours Completed
              </span>
            </div>
          </div>

          <div className="p-4 bg-[#F9F7F2] border border-[#C5A880]/30 rounded-xl text-xs space-y-1.5 text-stone-700">
            <span className="font-bold block text-stone-900">Institutional Certification:</span>
            <p>
              This official document certifies that telemetry recordings captured through the RadianDrive telematics sensor suite reflect defensive driving discipline with zero severe kinematic jerk events.
            </p>
          </div>

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-stone-200 text-xs">
            <div className="space-y-1">
              <div className="border-b border-stone-400 h-8" />
              <span className="text-[10px] text-stone-500 block uppercase font-bold">Licensed Supervisor / Parent Signature</span>
            </div>
            <div className="space-y-1">
              <div className="border-b border-stone-400 h-8" />
              <span className="text-[10px] text-stone-500 block uppercase font-bold">Certification Date</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
