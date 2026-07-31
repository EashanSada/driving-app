import React, { useState } from 'react';
import { User, ShieldAlert, ArrowRight, CheckCircle2, Trophy, Phone, Mail, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { accountExists, createAccountAsync, fetchAccountFromSupabase, getAccount, getAllAccounts, setActiveUsername, UserAccount } from '../lib/accountManager';

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
  const [step, setStep] = useState<'USERNAME' | 'REGISTER'>('USERNAME');
  const [usernameInput, setUsernameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  const existingAccounts = getAllAccounts();

  if (!isOpen) return null;

  const handleUsernameSubmit = async (e: React.FormEvent) => {
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
      // 1. Check local storage first
      if (accountExists(clean)) {
        setActiveUsername(clean);
        onLoginSuccess(clean);
        resetModalState();
        return;
      }

      // 2. Check Supabase cloud database
      const cloudAccount = await fetchAccountFromSupabase(clean);
      if (cloudAccount) {
        setActiveUsername(clean);
        onLoginSuccess(clean);
        resetModalState();
        return;
      }

      // 3. New user: proceed to registration form
      setStep('REGISTER');
    } catch (err) {
      console.error('Login submit check failed:', err);
      setStep('REGISTER');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!parentName.trim()) {
      setErrorMsg("Please enter parent / guardian's full name.");
      return;
    }
    if (!parentPhone.trim()) {
      setErrorMsg("Please enter parent / guardian's phone number.");
      return;
    }
    if (!parentEmail.trim() || !parentEmail.includes('@')) {
      setErrorMsg("Please enter a valid parent / guardian's email.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newAcc = await createAccountAsync({
        username: usernameInput.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail.trim()
      });

      onLoginSuccess(newAcc.username);
      resetModalState();
    } catch (err) {
      console.error('Registration failed:', err);
      setErrorMsg('Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectExisting = (acc: UserAccount) => {
    setActiveUsername(acc.username);
    onLoginSuccess(acc.username);
    resetModalState();
  };

  const resetModalState = () => {
    setStep('USERNAME');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="glass-card max-w-lg w-full p-6 border border-[#2dd4bf]/30 shadow-2xl relative my-8 overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#a78bfa]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2dd4bf] to-[#a78bfa] p-0.5 mx-auto shadow-lg glow-mint flex items-center justify-center">
              <div className="w-full h-full bg-[#020617] rounded-[14px] flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-[#2dd4bf]" />
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white font-display">
              {step === 'USERNAME' ? (
                <>DRIVESAFE <span className="text-[#2dd4bf]">ACCOUNT LOGIN</span></>
              ) : (
                <>NEW DRIVER <span className="text-[#2dd4bf]">REGISTRATION</span></>
              )}
            </h2>
            <p className="text-xs text-slate-300">
              {step === 'USERNAME'
                ? 'Enter your username. Existing accounts log in instantly; new usernames register below.'
                : `Complete real driver and parent verification for @${usernameInput.trim()}`}
            </p>
          </div>

          {/* STEP 1: Enter Username */}
          {step === 'USERNAME' && (
            <div className="space-y-6">
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Enter Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4 text-[#2dd4bf]" />
                    </div>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="e.g. AlexDriver, JordanKey, Sam99..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#020617]/90 border border-white/20 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all font-medium"
                      autoFocus
                    />
                  </div>
                  {errorMsg && (
                    <p className="text-xs text-rose-400 font-semibold mt-1.5">{errorMsg}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] text-slate-950 font-extrabold text-sm hover:shadow-lg transition-all cursor-pointer glow-mint flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Saved Accounts List */}
              {existingAccounts.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Registered Accounts on this Device
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {existingAccounts.map((acc) => (
                      <button
                        key={acc.username}
                        onClick={() => handleSelectExisting(acc)}
                        className="w-full p-2.5 rounded-xl bg-[#020617]/60 hover:bg-slate-800/60 border border-white/10 hover:border-[#2dd4bf]/40 flex items-center justify-between text-left transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#2dd4bf]/20 text-[#2dd4bf] font-bold text-xs flex items-center justify-center border border-[#2dd4bf]/40">
                            {acc.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{acc.username}</span>
                              {acc.fullName && acc.fullName !== acc.username && (
                                <span className="text-[10px] font-normal text-slate-400">({acc.fullName})</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {acc.totalTrips} Trips • {acc.totalDistanceMiles.toFixed(1)} mi
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2dd4bf]">
                          <Trophy className="w-3.5 h-3.5 text-[#2dd4bf]" />
                          <span>{acc.safetyScore} pts</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Registration Form */}
          {step === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
              <div className="p-3 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 text-xs text-[#2dd4bf] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  New username <strong>@{usernameInput.trim()}</strong>. Please enter your real driver and parent details to complete setup.
                </span>
              </div>

              {/* Driver Section */}
              <div className="space-y-3">
                <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-1">
                  <User className="w-3.5 h-3.5 text-[#2dd4bf]" /> Driver Details
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Driver's Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full px-3 py-2 rounded-lg bg-[#020617]/90 border border-white/20 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#2dd4bf]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Driver's Phone *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 012-3456"
                      className="w-full px-3 py-2 rounded-lg bg-[#020617]/90 border border-white/20 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#2dd4bf]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Driver's Email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="driver@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-[#020617]/90 border border-white/20 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#2dd4bf]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Parent Section */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-1">
                  <Users className="w-3.5 h-3.5 text-[#a78bfa]" /> Parent / Guardian Details
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Parent / Guardian Full Name *
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full px-3 py-2 rounded-lg bg-[#020617]/90 border border-white/20 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#a78bfa]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Parent's Phone *
                    </label>
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="(555) 987-6543"
                      className="w-full px-3 py-2 rounded-lg bg-[#020617]/90 border border-white/20 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#a78bfa]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Parent's Email *
                    </label>
                    <input
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-[#020617]/90 border border-white/20 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#a78bfa]"
                      required
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('USERNAME')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] text-slate-950 font-extrabold text-xs hover:shadow-lg transition-all cursor-pointer glow-mint flex items-center justify-center gap-1.5"
                >
                  <span>Complete Account Registration</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {allowCancel && onClose && (
            <button
              type="button"
              onClick={() => {
                resetModalState();
                onClose();
              }}
              className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors pt-1"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
