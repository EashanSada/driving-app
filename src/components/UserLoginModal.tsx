import React, { useState } from 'react';
import { User, ShieldAlert, ArrowRight, UserPlus, CheckCircle2, Trophy } from 'lucide-react';
import { getAllAccounts, setActiveUsername, UserAccount } from '../lib/accountManager';

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
  const [usernameInput, setUsernameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const existingAccounts = getAllAccounts();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
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

    setActiveUsername(clean);
    onLoginSuccess(clean);
  };

  const handleSelectExisting = (acc: UserAccount) => {
    setActiveUsername(acc.username);
    onLoginSuccess(acc.username);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 border border-[#2dd4bf]/30 shadow-2xl relative overflow-hidden">
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
              DRIVESAFE <span className="text-[#2dd4bf]">ACCOUNT</span>
            </h2>
            <p className="text-xs text-slate-300">
              Enter your username to access your real drive telemetry, safety score, and earned badges.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Your Username
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
                  placeholder="e.g. Alex, Driver1, Jordan..."
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] text-slate-950 font-extrabold text-sm hover:shadow-lg transition-all cursor-pointer glow-mint flex items-center justify-center gap-2"
            >
              <span>Enter Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Existing Accounts List */}
          {existingAccounts.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Saved Accounts on this device
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {existingAccounts.map((acc) => (
                  <button
                    key={acc.username}
                    onClick={() => handleSelectExisting(acc)}
                    className="w-full p-2.5 rounded-xl bg-[#020617]/60 hover:bg-slate-800/60 border border-white/10 hover:border-[#2dd4bf]/40 flex items-center justify-between text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#2dd4bf]/20 text-[#2dd4bf] font-bold text-xs flex items-center justify-center border border-[#2dd4bf]/40">
                        {acc.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{acc.username}</div>
                        <div className="text-[10px] text-slate-400">
                          {acc.totalTrips} Trips • {acc.totalDistanceMiles.toFixed(1)} mi
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2dd4bf]">
                      <Trophy className="w-3.5 h-3.5 text-[#2dd4bf]" />
                      <span>{acc.safetyScore}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {allowCancel && onClose && (
            <button
              type="button"
              onClick={onClose}
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
