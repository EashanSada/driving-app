import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Users,
  GraduationCap,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import {
  accountExists,
  createAccountAsync,
  fetchAccountFromSupabase,
  getAllAccounts,
  setActiveUsername
} from '../lib/accountManager';
import { UserRole } from '../types';
import { RadianSymbol } from './RadianSymbol';

interface UserLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (username: string) => void;
  onClose?: () => void;
  allowCancel?: boolean;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
  allowCancel = false
}) => {
  const [step, setStep] = useState<'LOGIN' | 'ROLE' | 'DETAILS' | 'PREFERENCES'>('LOGIN');
  const [usernameInput, setUsernameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration Data
  const [selectedRole, setSelectedRole] = useState<UserRole>('young_driver');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Preferences
  const [voiceAlerts, setVoiceAlerts] = useState(true);
  const [autoTripDetect, setAutoTripDetect] = useState(true);

  const existingAccounts = getAllAccounts();

  if (!isOpen) return null;

  const handleLoginCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim();
    if (!clean) {
      setErrorMsg('Please enter a username.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const cloudAccount = await fetchAccountFromSupabase(clean);
      if (cloudAccount) {
        setActiveUsername(clean);
        onLoginSuccess(clean);
        resetState();
        return;
      }

      if (accountExists(clean)) {
        setActiveUsername(clean);
        onLoginSuccess(clean);
        resetState();
        return;
      }

      setStep('ROLE');
    } catch (err: any) {
      if (accountExists(clean)) {
        setActiveUsername(clean);
        onLoginSuccess(clean);
        resetState();
      } else {
        setStep('ROLE');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccountFinal = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await createAccountAsync({
        username: usernameInput.trim(),
        fullName: fullName.trim() || usernameInput.trim(),
        phone: phone.trim(),
        email: email.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: ''
      });

      setActiveUsername(usernameInput.trim());
      onLoginSuccess(usernameInput.trim());
      resetState();
    } catch (err: any) {
      setErrorMsg('Failed to save account: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep('LOGIN');
    setUsernameInput('');
    setErrorMsg('');
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="luxury-card max-w-lg w-full p-6 sm:p-8 border border-[#C5A880]/30 shadow-2xl relative text-left">
        {allowCancel && onClose && (
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* STEP 1: Quick Username Lookup / Login */}
        {step === 'LOGIN' && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center mx-auto shadow-md">
                <RadianSymbol size={32} />
              </div>
              <h2 className="text-2xl font-black text-stone-900 font-display uppercase tracking-[0.2em]">
                RADIAN<span className="text-[#A38258]">DRIVE</span>
              </h2>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Precision telematics, safety scores, and supervised licensing hours for teen drivers.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLoginCheck} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Driver Username
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. alex_driver, sarah_k"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-gold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Continue to Drive</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Access Switcher for Existing Accounts */}
            {existingAccounts.length > 0 && (
              <div className="pt-4 border-t border-stone-100 space-y-2">
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                  Switch Account
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {existingAccounts.map((acc) => (
                    <button
                      key={acc.username}
                      onClick={() => {
                        setActiveUsername(acc.username);
                        onLoginSuccess(acc.username);
                        resetState();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-xs font-bold text-stone-800 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{acc.fullName || acc.username}</span>
                      <span className="text-[10px] text-[#A38258]">({acc.safetyScore} pts)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Role Selection */}
        {step === 'ROLE' && (
          <div className="space-y-5">
            <div>
              <span className="text-[10px] text-[#A38258] uppercase font-bold tracking-widest font-mono">
                Step 1 of 3 • Account Setup
              </span>
              <h3 className="text-lg font-bold text-stone-900 font-display mt-0.5">Choose Driver Account Type</h3>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'young_driver' as UserRole,
                  title: 'Young / Teen Driver',
                  desc: 'Provisional or young licensed driver tracking defensive habits and rewards.',
                  icon: <User className="w-4 h-4 text-[#A38258]" />
                },
                {
                  id: 'gdl_student' as UserRole,
                  title: "Learner's Permit Student",
                  desc: '50-hour state GDL tracker with day/night logs and parent oversight.',
                  icon: <GraduationCap className="w-4 h-4 text-stone-900" />
                },
                {
                  id: 'parent_mentor' as UserRole,
                  title: 'Parent / Family Mentor',
                  desc: 'Review teen telemetry, supervise practice hours, and export DMV reports.',
                  icon: <ShieldCheck className="w-4 h-4 text-emerald-700" />
                },
                {
                  id: 'driving_instructor' as UserRole,
                  title: 'Certified Driving Instructor',
                  desc: 'Manage student rosters, certify driving competencies, and coach road safety.',
                  icon: <Users className="w-4 h-4 text-indigo-700" />
                }
              ].map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    selectedRole === r.id
                      ? 'bg-white border-[#C5A880] shadow-md'
                      : 'bg-stone-50 border-stone-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{r.icon}</div>
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">{r.title}</span>
                      <p className="text-[11px] text-stone-500 mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedRole === r.id ? 'border-[#A38258] bg-[#A38258]' : 'border-stone-300'
                    }`}
                  >
                    {selectedRole === r.id && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStep('LOGIN')}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="btn-gold px-4 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Profile Details */}
        {step === 'DETAILS' && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-[#A38258] uppercase font-bold tracking-widest font-mono">
                Step 2 of 3 • Profile Details
              </span>
              <h3 className="text-lg font-bold text-stone-900 font-display mt-0.5">Driver & Contact Information</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexander Rivera"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="driver@example.com"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              {(selectedRole === 'young_driver' || selectedRole === 'gdl_student') && (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <span className="text-[10px] text-stone-500 uppercase font-bold block">Parent / Supervisor Contact</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Parent Name"
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="Parent Phone"
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStep('ROLE')}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('PREFERENCES')}
                className="btn-gold px-4 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Preferences & Confirmation */}
        {step === 'PREFERENCES' && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-[#A38258] uppercase font-bold tracking-widest font-mono">
                Step 3 of 3 • Safety Coaching
              </span>
              <h3 className="text-lg font-bold text-stone-900 font-display mt-0.5">Telematics Preferences</h3>
            </div>

            <div className="space-y-2">
              <div
                onClick={() => setVoiceAlerts(!voiceAlerts)}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Voice Safety Coach</span>
                  <span className="text-[10px] text-stone-500">Real-time spoken feedback on sudden braking</span>
                </div>
                <input type="checkbox" checked={voiceAlerts} readOnly className="rounded text-[#A38258]" />
              </div>

              <div
                onClick={() => setAutoTripDetect(!autoTripDetect)}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Automatic Trip Detection</span>
                  <span className="text-[10px] text-stone-500">Auto-start sessions when vehicle motion is sensed</span>
                </div>
                <input type="checkbox" checked={autoTripDetect} readOnly className="rounded text-[#A38258]" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateAccountFinal}
                disabled={isSubmitting}
                className="btn-gold px-5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Complete & Enter Cockpit</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
