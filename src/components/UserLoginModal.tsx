import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Trophy,
  Phone,
  Mail,
  Users,
  ArrowLeft,
  Loader2,
  Sparkles,
  Volume2,
  Zap,
  Gauge,
  GraduationCap
} from 'lucide-react';
import {
  accountExists,
  createAccountAsync,
  fetchAccountFromSupabase,
  getAccount,
  getAllAccounts,
  setActiveUsername,
  UserAccount
} from '../lib/accountManager';
import { UserRole, UserPreferences } from '../types';

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
  const [licenseStage, setLicenseStage] = useState<'permit' | 'provisional' | 'full'>('permit');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  // Preferences
  const [voiceAlerts, setVoiceAlerts] = useState(true);
  const [audioChimes, setAudioChimes] = useState(true);
  const [autoTripDetect, setAutoTripDetect] = useState(true);
  const [speedLimitOverlay, setSpeedLimitOverlay] = useState(true);

  const existingAccounts = getAllAccounts();

  if (!isOpen) return null;

  const handleLoginCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim();
    if (!clean) {
      setErrorMsg('Please enter a username to proceed.');
      return;
    }
    if (clean.length < 2) {
      setErrorMsg('Username must be at least 2 characters long.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Check Supabase cloud database
      const cloudAccount = await fetchAccountFromSupabase(clean);
      if (cloudAccount) {
        setActiveUsername(clean);
        onLoginSuccess(clean);
        resetState();
        return;
      }

      // 2. Fall back to local storage cache
      if (accountExists(clean)) {
        setActiveUsername(clean);
        onLoginSuccess(clean);
        resetState();
        return;
      }

      // 3. New account: move to Role selection
      setStep('ROLE');
    } catch (err) {
      console.error('Login submit check failed:', err);
      setStep('ROLE');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (username: string) => {
    setActiveUsername(username);
    onLoginSuccess(username);
    resetState();
  };

  const handleFinishRegistration = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const preferences: UserPreferences = {
        audioVoiceAlerts: voiceAlerts,
        audioChimes: audioChimes,
        autoTripDetection: autoTripDetect,
        speedLimitWarnings: speedLimitOverlay,
        offlineSyncEnabled: true,
        role: selectedRole,
        gdlEnabled: selectedRole === 'gdl_student' || licenseStage === 'permit'
      };

      const result = await createAccountAsync({
        username: usernameInput.trim(),
        fullName: fullName.trim() || usernameInput.trim(),
        phone: phone.trim(),
        email: email.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail.trim()
      });

      const updatedAccount: UserAccount = {
        ...result.account,
        role: selectedRole,
        licenseStage,
        preferences
      };

      // Re-save with preferences
      localStorage.setItem('drivesafe_active_username_v2', updatedAccount.username);
      const allMap = JSON.parse(localStorage.getItem('drivesafe_accounts_map_v2') || '{}');
      allMap[updatedAccount.username.toLowerCase()] = updatedAccount;
      localStorage.setItem('drivesafe_accounts_map_v2', JSON.stringify(allMap));

      onLoginSuccess(updatedAccount.username);
      resetState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep('LOGIN');
    setUsernameInput('');
    setErrorMsg('');
    setFullName('');
    setPhone('');
    setEmail('');
    setParentName('');
    setParentPhone('');
    setParentEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="glass-card max-w-lg w-full p-6 md:p-8 border border-[#2dd4bf]/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Step 1: Login / Start */}
        {step === 'LOGIN' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 mx-auto flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-6 h-6 text-[#2dd4bf]" />
              </div>
              <h2 className="text-xl font-extrabold text-white font-display">Driver Portal Sign In</h2>
              <p className="text-xs text-slate-300">
                Enter your username to access your telemetry scores, trip history, and safety goals.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLoginCheck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. alex_rivera"
                    autoFocus
                    required
                    className="w-full bg-[#020617] border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#2dd4bf] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to DriveSafe</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Switch from local storage */}
            {existingAccounts.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Switch Active Local Driver
                </span>
                <div className="flex flex-wrap gap-2">
                  {existingAccounts.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleQuickSelect(acc.username)}
                      className="px-3 py-1.5 rounded-lg bg-[#020617] border border-white/10 hover:border-[#2dd4bf]/50 text-xs text-slate-200 hover:text-white transition-all flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#2dd4bf]" />
                      <span className="font-bold">{acc.username}</span>
                      <span className="text-[10px] text-[#2dd4bf] font-mono">({acc.safetyScore} pts)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allowCancel && onClose && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Continue in Anonymous Guest Mode
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 'ROLE' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('LOGIN')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[11px] font-mono text-[#2dd4bf]">Step 1 of 3</span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-extrabold text-white font-display">Select Your Primary Role</h2>
              <p className="text-xs text-slate-300">
                DriveSafe adapts its tools so your interface remains clean and relevant.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'young_driver' as UserRole,
                  title: 'Young Driver',
                  desc: 'Track trip smoothness, speed adherence, and insurance discount scores.',
                  icon: Gauge
                },
                {
                  id: 'gdl_student' as UserRole,
                  title: 'GDL Permit Student',
                  desc: 'Log mandatory 50 day/night supervised driving hours for state licensing.',
                  icon: GraduationCap
                },
                {
                  id: 'parent_mentor' as UserRole,
                  title: 'Parent / Mentor',
                  desc: 'Review safety scores, export PDF driver reports, and supervise sessions.',
                  icon: Users
                },
                {
                  id: 'driving_instructor' as UserRole,
                  title: 'Instructor / School',
                  desc: 'Manage student cohorts and evaluate telematics safety ratings.',
                  icon: Trophy
                }
              ].map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-[#2dd4bf]/15 border-[#2dd4bf] text-white shadow-lg'
                        : 'bg-[#020617]/70 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#2dd4bf]' : 'text-slate-400'}`} />
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{role.title}</div>
                      <div className="text-[11px] text-slate-400 leading-snug mt-1">{role.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep('DETAILS')}
              className="w-full py-3 px-4 rounded-xl bg-[#2dd4bf] text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Next: Driver Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Profile Details & Licensing */}
        {step === 'DETAILS' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('ROLE')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[11px] font-mono text-[#2dd4bf]">Step 2 of 3</span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-extrabold text-white font-display">Driver Information</h2>
              <p className="text-xs text-slate-300">Set up your profile for {usernameInput}</p>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full bg-[#020617] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full bg-[#020617] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="driver@example.com"
                    className="w-full bg-[#020617] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase">Licensing Stage</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'permit', label: "Learner's Permit" },
                    { id: 'provisional', label: 'Provisional' },
                    { id: 'full', label: 'Full License' }
                  ].map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setLicenseStage(stage.id as any)}
                      className={`p-2 rounded-lg text-center text-xs font-bold border transition-all cursor-pointer ${
                        licenseStage === stage.id
                          ? 'bg-[#2dd4bf]/20 border-[#2dd4bf] text-[#2dd4bf]'
                          : 'bg-[#020617] border-white/10 text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-slate-300 block mb-2 uppercase">
                  Parent / Mentor Contact (Optional)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Mentor Name"
                    className="bg-[#020617] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                  />
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="mentor@example.com"
                    className="bg-[#020617] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep('PREFERENCES')}
              className="w-full py-3 px-4 rounded-xl bg-[#2dd4bf] text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Next: Safety Assist Preferences</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 4: Safety Assist Preferences */}
        {step === 'PREFERENCES' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('DETAILS')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[11px] font-mono text-[#2dd4bf]">Step 3 of 3</span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-extrabold text-white font-display">Safety Assist Preferences</h2>
              <p className="text-xs text-slate-300">Enable features tailored to your driving environment.</p>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: 'Audio Voice Alerts',
                  desc: 'Clear spoken safety notices when sudden braking or sharp cornering occurs.',
                  checked: voiceAlerts,
                  toggle: () => setVoiceAlerts(!voiceAlerts),
                  icon: Volume2
                },
                {
                  label: 'Motion Auto-Start & Auto-Stop',
                  desc: 'Automatically begins trip recording when driving and concludes when parked.',
                  checked: autoTripDetect,
                  toggle: () => setAutoTripDetect(!autoTripDetect),
                  icon: Zap
                },
                {
                  label: 'Posted Speed Limit Advisory',
                  desc: 'Real-time road speed limit comparison and caution alerts.',
                  checked: speedLimitOverlay,
                  toggle: () => setSpeedLimitOverlay(!speedLimitOverlay),
                  icon: Gauge
                }
              ].map((pref, idx) => {
                const Icon = pref.icon;
                return (
                  <div
                    key={idx}
                    onClick={pref.toggle}
                    className="p-3.5 rounded-xl bg-[#020617]/70 border border-white/10 flex items-center justify-between cursor-pointer hover:border-[#2dd4bf]/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/5">
                        <Icon className="w-4 h-4 text-[#2dd4bf]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{pref.label}</div>
                        <div className="text-[11px] text-slate-400 leading-snug">{pref.desc}</div>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                        pref.checked ? 'bg-[#2dd4bf]' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                          pref.checked ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleFinishRegistration}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Setup & Open DriveSafe</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
